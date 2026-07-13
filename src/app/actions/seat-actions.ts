'use server'

import prisma from "@/lib/prisma"
import { revalidatePath, updateTag } from "next/cache"
import { SeatType } from "@prisma/client"
import { getSession } from "./auth-actions"
import { redis } from "@/lib/redis"

// Reasonable upper bounds to reject malformed/abusive payloads.
const MAX_SEATS = 2000;
const MAX_LOCKERS = 1000;

export async function saveSeatLayoutAndLockers(seats: any[], standaloneLockers: any[], compactSeatMap: boolean = false, seatNaming: string = 'ALPHANUMERIC') {
  const session = await getSession();
  if (!session || (session.role !== 'LIBRARIAN' && session.role !== 'ADMIN')) throw new Error("Unauthorized");

  if (!Array.isArray(seats) || !Array.isArray(standaloneLockers)) {
    throw new Error("Invalid layout payload");
  }
  if (seats.length > MAX_SEATS || standaloneLockers.length > MAX_LOCKERS) {
    throw new Error("Layout is too large");
  }

  const library = await prisma.library.findFirst({ where: session.role === 'ADMIN' ? {} : { librarianId: session.userId } });
  if (!library) throw new Error("Library not found");

  // Filter out EMPTY seats (empty space in grid)
  const activeSeats = seats.filter(s => s && s.type !== 'EMPTY' && typeof s.id === 'string');

  const now = new Date();

  // Run the whole sync atomically so a failure can never leave the library
  // with a half-deleted layout.
  await prisma.$transaction(async (tx) => {
    // Seats that currently back an active booking MUST NOT be deleted — doing
    // so would either FK-error or orphan a paying student's reservation.
    const bookedSeats = await tx.seat.findMany({
      where: {
        libraryId: library.id,
        bookings: {
          some: { status: { in: ['CONFIRMED', 'PENDING_PAYMENT'] }, endTime: { gt: now } },
        },
      },
      select: { id: true, name: true, gridX: true, gridY: true },
    });
    const protectedSeatNames = new Set(bookedSeats.map((s) => s.name));

    // Delete only seats that are NOT protected.
    await tx.seat.deleteMany({
      where: { libraryId: library.id, name: { notIn: Array.from(protectedSeatNames) } },
    });

    // Insert the new layout, skipping any name that is still protected (kept above).
    const seatData = activeSeats
      .filter((s) => !protectedSeatNames.has(s.id))
      .map((s) => ({
        libraryId: library.id,
        name: s.id,
        type: s.type as SeatType,
        gridX: s.x,
        gridY: s.y,
        hasLocker: s.hasLocker || false,
        lockerPriceMonthly: s.hasLocker ? (parseFloat(s.lockerPriceMonthly) || null) : null,
        premiumPriceMonthly: s.type === 'PREMIUM' ? (parseFloat(s.premiumPriceMonthly) || null) : null,
        syncPremiumOffers: s.syncPremiumOffers !== undefined ? s.syncPremiumOffers : true,
      }));

    // If naming convention changed, existing protected seats need to be renamed to match their grid coordinates in the new convention.
    // The frontend sends the correct new generated name as `s.id` in `activeSeats`.
    // We update all protected seats if their computed name (from frontend) differs from their current name.
    if ((seatNaming as any) !== library.seatNaming) {
      for (const bookedSeat of bookedSeats) {
        const matchingActiveSeat = activeSeats.find(s => s.x === bookedSeat.gridX && s.y === bookedSeat.gridY);
        if (matchingActiveSeat && matchingActiveSeat.id !== bookedSeat.name) {
          await tx.seat.update({
            where: { id: bookedSeat.id },
            data: { name: matchingActiveSeat.id }
          });
          // Update the Set so we don't accidentally delete or re-create it under the new name
          protectedSeatNames.delete(bookedSeat.name);
          protectedSeatNames.add(matchingActiveSeat.id);
        }
      }
    }

    if (seatData.length > 0) {
      await tx.seat.createMany({ data: seatData, skipDuplicates: true });
    }

    // Same protection for standalone lockers.
    const bookedLockers = await tx.standaloneLocker.findMany({
      where: {
        libraryId: library.id,
        bookings: {
          some: { status: { in: ['CONFIRMED', 'PENDING_PAYMENT'] }, endTime: { gt: now } },
        },
      },
      select: { name: true },
    });
    const protectedLockerNames = new Set(bookedLockers.map((l) => l.name));

    await tx.standaloneLocker.deleteMany({
      where: { libraryId: library.id, name: { notIn: Array.from(protectedLockerNames) } },
    });

    const lockerData = standaloneLockers
      .filter((l) => l && typeof l.name === 'string' && !protectedLockerNames.has(l.name))
      .map((l) => ({
        libraryId: library.id,
        name: l.name,
        price: parseFloat(l.price) || 0,
      }));

    if (lockerData.length > 0) {
      await tx.standaloneLocker.createMany({ data: lockerData, skipDuplicates: true });
    }

    await tx.library.update({
      where: { id: library.id },
      data: { compactSeatMap, seatNaming: seatNaming as any }
    });
  });

  await redis.del(`library:${library.id}`);
  updateTag(`library:${library.id}`);
  revalidatePath(`/library/${library.id}`);
  revalidatePath("/dashboard/seats");
}

export async function getSeatLayoutAndLockers() {
  const session = await getSession();
  if (!session || (session.role !== 'LIBRARIAN' && session.role !== 'ADMIN')) return { seats: [], standaloneLockers: [], compactSeatMap: false };

  const library = await prisma.library.findFirst({
    where: session.role === 'ADMIN' ? {} : { librarianId: session.userId },
    include: {
      seats: true,
      standaloneLockers: true
    }
  });

  if (!library) return { seats: [], standaloneLockers: [], compactSeatMap: false };

  return {
    libraryId: library.id,
    seats: library.seats.map(s => ({
      id: s.name,
      x: s.gridX,
      y: s.gridY,
      type: s.type,
      hasLocker: s.hasLocker,
      lockerPriceMonthly: s.lockerPriceMonthly?.toString() || "",
      premiumPriceMonthly: s.premiumPriceMonthly?.toString() || "",
      syncPremiumOffers: s.syncPremiumOffers
    })),
    standaloneLockers: library.standaloneLockers.map(l => ({
      id: l.id,
      name: l.name,
      price: l.price.toString()
    })),
    compactSeatMap: library.compactSeatMap,
    seatNaming: library.seatNaming
  };
}
