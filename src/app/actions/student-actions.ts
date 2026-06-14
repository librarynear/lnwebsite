'use server'

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { Role, BookingStatus } from "@prisma/client"
import { getSession } from "./auth-actions"

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

  const library = await prisma.library.findFirst({ where: session.role === 'ADMIN' ? {} : { librarianId: session.userId } });
  if (!library) throw new Error("Library not found");

  const booking = await prisma.booking.findUnique({ 
    where: { id: bookingId },
    include: { plan: true } 
  });
  if (!booking || booking.libraryId !== library.id) throw new Error("Invalid booking");

  // Find the latest confirmed active booking for this user to append to
  const activeBooking = await prisma.booking.findFirst({
    where: {
      studentId: booking.studentId,
      libraryId: booking.libraryId,
      status: "CONFIRMED",
      endTime: { gt: new Date() }
    },
    orderBy: { endTime: 'desc' }
  });

  const startTime = activeBooking ? new Date(activeBooking.endTime) : new Date();
  const endTime = new Date(startTime);
  endTime.setDate(endTime.getDate() + booking.plan.validityDays);

  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: "CONFIRMED",
      paymentRef: `RECEPTION_${paymentMethod}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      startTime,
      endTime
    }
  });

  revalidatePath("/dashboard/students");
  return { success: true };
}

export async function revokeBooking(bookingId: string) {
  const session = await getSession();
  if (!session || (session.role !== 'LIBRARIAN' && session.role !== 'ADMIN')) throw new Error("Unauthorized");

  const library = await prisma.library.findFirst({ where: session.role === 'ADMIN' ? {} : { librarianId: session.userId } });
  if (!library) throw new Error("Library not found");

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.libraryId !== library.id) throw new Error("Invalid booking");

  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: "CANCELLED",
      endTime: new Date() // Expire it immediately
    }
  });

  revalidatePath("/dashboard/students");
  return { success: true };
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
    where: session.role === 'ADMIN' ? {} : { librarianId: session.userId } 
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
      // If a user with this phone exists, and authId is provided, we should ideally update them or fail.
      // But since we are creating a new student record for the library, if they exist we can just link the booking.
      // For now, let's just return the error so the librarian knows they already exist.
      return { error: "A student with this email or phone already exists" };
    }
    throw e;
  }

  // Create booking
  if (planId) {
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    const seatId = formData.get("seatId") as string;
    
    try {
      await prisma.$transaction(async (tx) => {
        let seat;
        const startTime = startDateStr ? new Date(startDateStr) : new Date();
        const endTime = new Date(startTime.getTime() + ((plan?.validityDays || 30) * 86400000));

        if (seatId) {
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
          // MVP random seat if not specified
          seat = await tx.seat.findFirst({ where: { libraryId: library.id } });
        }

        if (plan && seat) {
          await tx.booking.create({
            data: {
              studentId: student.id,
              libraryId: library.id,
              planId: plan.id,
              seatId: seat.id,
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

  const library = await prisma.library.findFirst({ where: session.role === 'ADMIN' ? {} : { librarianId: session.userId } });
  if (!library) throw new Error("Library not found");

  const booking = await prisma.booking.findUnique({ 
    where: { id: bookingId },
    include: { plan: true }
  });
  
  if (!booking || booking.libraryId !== library.id) throw new Error("Invalid booking");

  const now = new Date();
  const baseDate = booking.endTime > now ? booking.endTime : now;
  const newEndTime = new Date(baseDate);
  newEndTime.setDate(newEndTime.getDate() + booking.plan.validityDays);

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
