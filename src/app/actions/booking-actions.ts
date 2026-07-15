"use server"

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getSession } from "./auth-actions"
import {
  BookingAuthorityError,
  changeBookingSeat,
  pauseConfirmedBooking,
  resumePausedBooking,
} from "@/lib/booking-authority"
import { invalidateLibraryRuntimeCache } from "@/lib/library-cache"

async function authorizeBookingMutation(
  bookingId: string,
  options: { staffOnly?: boolean } = {},
) {
  const session = await getSession()
  if (!session) throw new Error("Unauthorized")
  if (
    options.staffOnly
    && session.role !== "LIBRARIAN"
    && session.role !== "ADMIN"
  ) {
    throw new Error("Unauthorized")
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { library: { select: { librarianId: true } } },
  })
  if (!booking) throw new Error("Booking not found")

  const ownsBooking = booking.studentId === session.userId
  const ownsLibrary = booking.library.librarianId === session.userId
  const isAdmin = session.role === "ADMIN"
  if (!ownsBooking && !ownsLibrary && !isAdmin) {
    throw new Error("Unauthorized to modify this booking")
  }
  return booking
}

export async function pauseBooking(bookingId: string) {
  const booking = await authorizeBookingMutation(bookingId)
  await pauseConfirmedBooking(bookingId)
  await invalidateLibraryRuntimeCache(booking.libraryId)
  revalidatePath("/")
  return { success: true }
}

export async function resumeBooking(bookingId: string) {
  const booking = await authorizeBookingMutation(bookingId)
  try {
    const result = await resumePausedBooking(bookingId)
    await invalidateLibraryRuntimeCache(booking.libraryId)
    revalidatePath("/")
    return { success: true, extendedDays: result.extendedDays }
  } catch (error) {
    if (
      error instanceof BookingAuthorityError
      && error.code === "RESOURCE_TAKEN"
    ) {
      throw new Error("The seat or locker is no longer available for the extension.")
    }
    throw error
  }
}

export async function updateBookingSeat(
  bookingId: string,
  seatId: string | null,
) {
  const booking = await authorizeBookingMutation(bookingId, { staffOnly: true })
  try {
    await changeBookingSeat(bookingId, seatId)
  } catch (error) {
    if (
      error instanceof BookingAuthorityError
      && error.code === "RESOURCE_TAKEN"
    ) {
      throw new Error("That seat is already booked or held for this period.")
    }
    throw error
  }

  await invalidateLibraryRuntimeCache(booking.libraryId)
  revalidatePath("/dashboard/students")
  return { success: true }
}
