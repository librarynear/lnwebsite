'use server'

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getSession } from "./auth-actions"

export async function pauseBooking(bookingId: string) {
  const session = await getSession()
  if (!session) throw new Error("Unauthorized")

  return await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: { library: true }
    })

    if (!booking) throw new Error("Booking not found")

    if (booking.studentId !== session.userId && booking.library.librarianId !== session.userId) {
      throw new Error("Unauthorized to modify this booking")
    }

    if (booking.isPaused) throw new Error("Booking is already paused")

    if (booking.status !== "CONFIRMED") {
      throw new Error("Only active confirmed bookings can be paused")
    }

    await tx.booking.update({
      where: { id: bookingId },
      data: {
        isPaused: true,
        pausedAt: new Date()
      }
    })

    revalidatePath("/")
    return { success: true }
  })
}

export async function resumeBooking(bookingId: string) {
  const session = await getSession()
  if (!session) throw new Error("Unauthorized")

  return await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: { library: true }
    })

    if (!booking) throw new Error("Booking not found")

    if (booking.studentId !== session.userId && booking.library.librarianId !== session.userId) {
      throw new Error("Unauthorized to modify this booking")
    }

    if (!booking.isPaused || !booking.pausedAt) {
      throw new Error("Booking is not currently paused")
    }

    const now = new Date()
    const diffTime = Math.max(0, now.getTime() - booking.pausedAt.getTime())
    const diffDays = Math.min(365, Math.floor(diffTime / (1000 * 60 * 60 * 24)))

    let newEndTime = booking.endTime
    let daysToAdd = 0

    if (diffDays >= 7) {
      daysToAdd = diffDays
      newEndTime = new Date(booking.endTime)
      newEndTime.setDate(newEndTime.getDate() + diffDays)
    }

    await tx.booking.update({
      where: { id: bookingId },
      data: {
        isPaused: false,
        pausedAt: null,
        totalPausedDays: booking.totalPausedDays + daysToAdd,
        endTime: newEndTime,
      },
    })

    revalidatePath("/")
    return { success: true, extendedDays: daysToAdd }
  })
}

export async function updateBookingSeat(bookingId: string, seatId: string | null) {
  const session = await getSession()
  if (!session || (session.role !== 'LIBRARIAN' && session.role !== 'ADMIN')) {
    throw new Error("Unauthorized")
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { library: true, plan: true }
  })

  if (!booking) throw new Error("Booking not found")

  if (session.role === 'LIBRARIAN' && booking.library.librarianId !== session.userId) {
    throw new Error("Unauthorized")
  }

  // Reserved (fixed-seat) plans must always have a seat.
  if (booking.plan.type !== 'FLEXIBLE' && !seatId) {
    throw new Error("A seat is required for reserved (fixed-seat) plans.")
  }

  try {
    await prisma.$transaction(async (tx) => {
      if (seatId) {
        // The target seat must belong to this booking's library.
        const seat = await tx.seat.findFirst({ where: { id: seatId, libraryId: booking.libraryId } })
        if (!seat) throw new Error("Invalid seat")

        // Reject moving onto a seat already held for an overlapping period.
        const clash = await tx.booking.findFirst({
          where: {
            seatId,
            id: { not: bookingId },
            status: { in: ['CONFIRMED', 'PENDING_PAYMENT'] },
            startTime: { lt: booking.endTime },
            endTime: { gt: booking.startTime },
          },
        })
        if (clash) throw new Error("SEAT_TAKEN")
      }

      await tx.booking.update({
        where: { id: bookingId },
        data: { seatId },
      })
    }, { isolationLevel: 'Serializable' })
  } catch (e: any) {
    if (e.message === 'SEAT_TAKEN') throw new Error("That seat is already booked for this period.")
    throw e
  }

  revalidatePath("/dashboard/students")
  return { success: true }
}
