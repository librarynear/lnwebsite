'use server'

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { Role, BookingStatus } from "@prisma/client"

// Utility to generate a random 6-character string (A-Z, 2-9)
function generateRandom6CharString() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function generateUniqueId() {
  let isUnique = false;
  let newId = '';
  
  while (!isUnique) {
    newId = generateRandom6CharString();
    const existing = await prisma.user.findUnique({ where: { uniqueId: newId } });
    if (!existing) isUnique = true;
  }
  
  return newId;
}

export async function addStudentWithBooking(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const planId = formData.get("planId") as string;
  
  const library = await prisma.library.findFirst();
  if (!library) throw new Error("No library found.");

  const uniqueId = await generateUniqueId();

  // Create user
  const student = await prisma.user.create({
    data: {
      authId: `mock-auth-${uniqueId}`, // Mock auth ID
      role: Role.STUDENT,
      name,
      email,
      phone,
      uniqueId
    }
  });

  // Create booking
  if (planId) {
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    const seat = await prisma.seat.findFirst({ where: { libraryId: library.id } }); // Assign random seat for MVP
    
    if (plan && seat) {
      await prisma.booking.create({
        data: {
          studentId: student.id,
          libraryId: library.id,
          planId: plan.id,
          seatId: seat.id,
          startTime: new Date(),
          endTime: new Date(Date.now() + (plan.validityDays * 86400000)),
          status: BookingStatus.CONFIRMED,
        }
      });
    }
  }

  revalidatePath("/dashboard/students");
}
