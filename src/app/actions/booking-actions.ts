'use server'

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getSession } from "./auth-actions"

export async function pauseBooking(bookingId: string) {
  const session = await getSession()
  if (!session) throw new Error("Unauthorized")

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { library: true }
  })

  if (!booking) throw new Error("Booking not found")

  // Ensure user is either the student who owns the booking or the librarian of the library
  if (booking.studentId !== session.userId && booking.library.librarianId !== session.userId) {
    throw new Error("Unauthorized to modify this booking")
  }

  if (booking.isPaused) throw new Error("Booking is already paused")

  // Cannot pause if the booking is already completed or cancelled
  if (booking.status !== "CONFIRMED") {
    throw new Error("Only active confirmed bookings can be paused")
  }

  // Set the booking to paused
  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      isPaused: true,
      pausedAt: new Date()
    }
  })

  revalidatePath("/")
  return { success: true }
}

export async function resumeBooking(bookingId: string) {
  const session = await getSession()
  if (!session) throw new Error("Unauthorized")

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { library: true }
  })

  if (!booking) throw new Error("Booking not found")

  // Ensure user is either the student who owns the booking or the librarian of the library
  if (booking.studentId !== session.userId && booking.library.librarianId !== session.userId) {
    throw new Error("Unauthorized to modify this booking")
  }

  if (!booking.isPaused || !booking.pausedAt) {
    throw new Error("Booking is not currently paused")
  }

  const now = new Date()
  const pausedAt = booking.pausedAt

  // Guard against a future-dated pausedAt (clock skew / tampering): never
  // produce a negative or inflated duration.
  const diffTime = Math.max(0, now.getTime() - pausedAt.getTime())
  // Cap the credited duration at 1 year to avoid runaway extensions.
  const diffDays = Math.min(365, Math.floor(diffTime / (1000 * 60 * 60 * 24)))

  let newEndTime = booking.endTime
  let daysToAdd = 0

  // Credit the paused days back only after a 7+ day pause (product rule).
  // Access is already blocked while paused (see check-in / relay cache), so
  // this credit simply compensates for the frozen period.
  if (diffDays >= 7) {
    daysToAdd = diffDays
    newEndTime = new Date(booking.endTime)
    newEndTime.setDate(newEndTime.getDate() + diffDays)
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      isPaused: false,
      pausedAt: null,
      totalPausedDays: booking.totalPausedDays + daysToAdd,
      endTime: newEndTime
    }
  })

  revalidatePath("/")
  return { success: true, extendedDays: daysToAdd }
}
