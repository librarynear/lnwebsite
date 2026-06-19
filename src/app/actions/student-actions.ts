'use server'

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { Role, BookingStatus } from "@prisma/client"
import { getSession } from "./auth-actions"
import { endOfDayIST } from "@/lib/date-utils"

// Utility to generate a random FD-YYXXXX string
async function generateUniqueId() {
  let isUnique = false;
  let newId = '';
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const yearStr = new Date().getFullYear().toString().slice(2, 4);

  while (!isUnique) {
    let randomPart = '';
    for (let i = 0; i < 4; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    newId = "FD-" + yearStr + randomPart;
    const existing = await prisma.user.findUnique({ where: { uniqueId: newId } });
    if (!existing) isUnique = true;
  }
  
  return newId;
}

export async function assignUniqueIdToStudent(studentId: string) {
  const session = await getSession();
  if (!session || (session.role !== 'LIBRARIAN' && session.role !== 'ADMIN')) throw new Error("Unauthorized");

  const student = await prisma.user.findUnique({ where: { id: studentId } });
  if (!student) throw new Error("Student not found");
  if (student.uniqueId) return { success: true, uniqueId: student.uniqueId };

  const newId = await generateUniqueId();
  await prisma.user.update({
    where: { id: studentId },
    data: { uniqueId: newId }
  });

  revalidatePath("/dashboard/students");
  return { success: true, uniqueId: newId };
}

export async function approveReceptionPayment(bookingId: string, paymentMethod: string) {
  const session = await getSession();
  if (!session || (session.role !== 'LIBRARIAN' && session.role !== 'ADMIN')) throw new Error("Unauthorized");

  const library = await prisma.library.findFirst({ where: { librarianId: session.userId } });
  if (!library) throw new Error("Library not found");

  const booking = await prisma.booking.findUnique({ 
    where: { id: bookingId },
    include: { plan: true } 
  });
  if (!booking || booking.libraryId !== library.id) throw new Error("Invalid booking");
  if (booking.status !== 'PENDING_PAYMENT') throw new Error("Booking is not pending payment");

  await prisma.$transaction(async (tx) => {
    const activeBooking = await tx.booking.findFirst({
      where: {
        studentId: booking.studentId,
        libraryId: booking.libraryId,
        status: "CONFIRMED",
        endTime: { gt: new Date() },
      },
      orderBy: { endTime: 'desc' },
    });

    let startTime = new Date();
    if (activeBooking) {
      startTime = new Date(activeBooking.endTime);
      startTime.setTime(startTime.getTime() + 1000); // 1 second into next day
    }
    const endTime = endOfDayIST(startTime, booking.plan.validityDays - 1);

    if (booking.seatId) {
      const clash = await tx.booking.findFirst({
        where: {
          seatId: booking.seatId,
          id: { not: bookingId },
          status: { in: ['CONFIRMED', 'PENDING_PAYMENT'] },
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        },
      });
      if (clash) throw new Error("Seat is no longer available");
    }

    if (booking.standaloneLockerId) {
      const clash = await tx.booking.findFirst({
        where: {
          standaloneLockerId: booking.standaloneLockerId,
          id: { not: bookingId },
          status: { in: ['CONFIRMED', 'PENDING_PAYMENT'] },
          endTime: { gt: new Date() },
        },
      });
      if (clash) throw new Error("Locker is no longer available");
    }

    await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: "CONFIRMED",
        paymentRef: `RECEPTION_${paymentMethod}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        startTime,
        endTime,
      },
    });
  }, { isolationLevel: 'Serializable' });

  revalidatePath("/dashboard/students");
  return { success: true };
}

export async function revokeBooking(bookingId: string, reason?: string) {
  const session = await getSession();
  if (!session || (session.role !== 'LIBRARIAN' && session.role !== 'ADMIN')) throw new Error("Unauthorized");

  const library = await prisma.library.findFirst({ where: { librarianId: session.userId } });
  if (!library) throw new Error("Library not found");

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.libraryId !== library.id) throw new Error("Invalid booking");

  const needsRefund = booking.paymentRef &&
    !booking.paymentRef.startsWith('RECEPTION_') &&
    !booking.paymentRef.startsWith('MANUAL_');

  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: "CANCELLED",
      endTime: new Date(),
      revokedReason: reason || null,
    },
  });

  revalidatePath("/dashboard/students");
  return { success: true, needsRefund };
}

export async function addStudentWithBooking(formData: FormData) {
  // Auth guard: only LIBRARIAN or ADMIN can add students with bookings
  const session = await getSession();
  if (!session || (session.role !== 'LIBRARIAN' && session.role !== 'ADMIN')) {
    return { error: 'Unauthorized' };
  }

  const name = (formData.get("name") as string)?.trim();
  const email = ((formData.get("email") as string) || "").trim();
  const phone = ((formData.get("phone") as string) || "").trim();
  const dobStr = formData.get("dob") as string;
  const gender = formData.get("gender") as string;
  const address = formData.get("address") as string;
  const planId = formData.get("planId") as string;
  const authId = formData.get("authId") as string;
  const startDateStr = formData.get("startDate") as string;
  const paymentMethod = formData.get("paymentMethod") as string;

  if (!name) return { error: "Student name is required" };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Invalid email address" };
  if (phone && !/^[0-9+\-\s()]{6,20}$/.test(phone)) return { error: "Invalid phone number" };

  const library = await prisma.library.findFirst({ 
    where: { librarianId: session.userId } 
  });
  if (!library) throw new Error("No library found.");

  const uniqueId = await generateUniqueId();

  // Create user (handle unique-constraint collisions on email/phone gracefully)
  let student;
  try {
    student = await prisma.user.create({
      data: {
        authId: authId || null,
        role: Role.STUDENT,
        name,
        email: email || null,
        phone: phone || null,
        uniqueId,
        dob: dobStr ? new Date(dobStr) : null,
        gender: gender || null,
        address: address || null
      }
    });
  } catch (e: any) {
    if (e?.code === 'P2002') {
      // Find the existing student by phone or email
      if (phone) {
        student = await prisma.user.findUnique({ where: { phone } });
      }
      if (!student && email) {
        student = await prisma.user.findUnique({ where: { email } });
      }
      
      if (!student) return { error: "A student with this email or phone already exists" };
      
      student = await prisma.user.update({
        where: { id: student.id },
        data: {
          name,
          dob: dobStr ? new Date(dobStr) : student.dob,
          gender: gender || student.gender,
          address: address || student.address
        }
      });
    } else {
      throw e;
    }
  }

  // Create booking
  if (planId) {
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    const seatId = formData.get("seatId") as string;
    
    try {
      await prisma.$transaction(async (tx) => {
        let seat = null;
        let startTime = startDateStr ? new Date(startDateStr) : new Date();
        const endTime = endOfDayIST(startTime, (plan?.validityDays || 30) - 1);

        if (plan && plan.type === 'FLEXIBLE') {
          // No seat for flexible plans
          seat = null;
        } else if (seatId) {
          seat = await tx.seat.findUnique({ where: { id: seatId, libraryId: library.id } });
          if (!seat) throw new Error("Invalid seat");

          const clash = await tx.booking.findFirst({
            where: {
              seatId: seat.id,
              status: { in: ["CONFIRMED", "PENDING_PAYMENT"] },
              startTime: { lt: endTime },
              endTime: { gt: startTime }
            }
          });
          if (clash) throw new Error("SEAT_TAKEN");
        } else {
          // MVP random seat if not specified and it's a FIXED plan
          seat = await tx.seat.findFirst({ where: { libraryId: library.id } });
        }

        if (plan) {
          await tx.booking.create({
            data: {
              studentId: student.id,
              libraryId: library.id,
              planId: plan.id,
              seatId: seat ? seat.id : null,
              startTime,
              endTime,
              status: BookingStatus.CONFIRMED,
              paymentRef: `MANUAL_${paymentMethod || 'CASH'}_${Date.now()}`
            }
          });
        }
      });
    } catch (e: any) {
      if (e.message === 'SEAT_TAKEN') return { error: "Seat is already booked for this duration" };
      throw e;
    }
  }

  revalidatePath("/dashboard/students");
}

export async function extendBookingExact(bookingId: string) {
  const session = await getSession();
  if (!session || (session.role !== 'LIBRARIAN' && session.role !== 'ADMIN')) throw new Error("Unauthorized");

  const library = await prisma.library.findFirst({ where: { librarianId: session.userId } });
  if (!library) throw new Error("Library not found");

  const booking = await prisma.booking.findUnique({ 
    where: { id: bookingId },
    include: { plan: true }
  });
  
  if (!booking || booking.libraryId !== library.id) throw new Error("Invalid booking");

  const now = new Date();
  const baseDate = booking.endTime > now ? booking.endTime : now;
  
  let newEndTime;
  if (booking.endTime > now) {
    newEndTime = endOfDayIST(booking.endTime, booking.plan.validityDays);
  } else {
    newEndTime = endOfDayIST(now, booking.plan.validityDays - 1);
  }

  try {
    await prisma.$transaction(async (tx) => {
      if (booking.seatId) {
        const clash = await tx.booking.findFirst({
          where: {
            seatId: booking.seatId,
            status: { in: ["CONFIRMED", "PENDING_PAYMENT"] },
            startTime: { lt: newEndTime },
            endTime: { gt: baseDate },
            id: { not: bookingId }
          }
        });
        if (clash) throw new Error("SEAT_TAKEN");
      }

      await tx.booking.update({
        where: { id: bookingId },
        data: {
          endTime: newEndTime,
          status: "CONFIRMED"
        }
      });
    });
  } catch (e: any) {
    if (e.message === 'SEAT_TAKEN') throw new Error("Cannot extend: Seat is already booked for the extended duration");
    throw e;
  }

  revalidatePath("/dashboard/students");
  return { success: true };
}

export async function unrevokeBooking(bookingId: string) {
  const session = await getSession();
  if (!session || (session.role !== 'LIBRARIAN' && session.role !== 'ADMIN')) throw new Error("Unauthorized");

  const library = await prisma.library.findFirst({ where: { librarianId: session.userId } });
  if (!library) throw new Error("Library not found");

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.libraryId !== library.id) throw new Error("Invalid booking");
  if (booking.status !== 'CANCELLED') throw new Error("Booking is not revoked");

  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: 'CONFIRMED' }
  });

  revalidatePath("/dashboard/students");
  return { success: true };
}

export async function renewPlan(bookingId: string, paymentMethod: string, newPlanId?: string, newSeatId?: string) {
  const session = await getSession();
  if (!session || (session.role !== 'LIBRARIAN' && session.role !== 'ADMIN')) throw new Error("Unauthorized");

  const library = await prisma.library.findFirst({ where: { librarianId: session.userId } });
  if (!library) throw new Error("Library not found");

  const booking = await prisma.booking.findUnique({ 
    where: { id: bookingId },
    include: { plan: true }
  });
  
  if (!booking || booking.libraryId !== library.id) throw new Error("Invalid booking");

  let targetPlan = booking.plan;
  if (newPlanId && newPlanId !== booking.planId) {
    const p = await prisma.plan.findUnique({ where: { id: newPlanId } });
    if (!p) throw new Error("Invalid new plan");
    targetPlan = p as any;
  }

  let targetSeatId = booking.seatId;
  if (targetPlan.type === 'FLEXIBLE') {
    targetSeatId = null;
  } else if (newSeatId !== undefined) {
    targetSeatId = newSeatId === "NONE" ? null : newSeatId;
  }

  const now = new Date();
  const baseDate = booking.endTime > now ? booking.endTime : now;
  
  let newEndTime;
  if (booking.endTime > now) {
    newEndTime = endOfDayIST(booking.endTime, targetPlan.validityDays);
  } else {
    newEndTime = endOfDayIST(now, targetPlan.validityDays - 1);
  }

  try {
    await prisma.$transaction(async (tx) => {
      if (targetSeatId) {
        const clash = await tx.booking.findFirst({
          where: {
            seatId: targetSeatId,
            status: { in: ["CONFIRMED", "PENDING_PAYMENT"] },
            startTime: { lt: newEndTime },
            endTime: { gt: baseDate },
            id: { not: bookingId }
          }
        });
        if (clash) throw new Error("SEAT_TAKEN");
      }

      await tx.booking.create({
        data: {
          studentId: booking.studentId,
          libraryId: booking.libraryId,
          planId: targetPlan.id,
          seatId: targetSeatId,
          startTime: baseDate,
          endTime: newEndTime,
          status: "CONFIRMED",
          paymentRef: `RENEWAL_${paymentMethod}_${Date.now()}`
        }
      });
    });
  } catch (e: any) {
    if (e.message === 'SEAT_TAKEN') throw new Error("Cannot renew: Seat is already booked for the extended duration");
    throw e;
  }

  revalidatePath("/dashboard/students");
  return { success: true };
}
