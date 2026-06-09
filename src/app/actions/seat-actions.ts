'use server'

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { SeatType } from "@prisma/client"
import { getSession } from "./auth-actions"

export async function saveSeatLayoutAndLockers(seats: any[], standaloneLockers: any[]) {
  const session = await getSession();
  if (!session || session.role !== 'LIBRARIAN') throw new Error("Unauthorized");

  const library = await prisma.library.findFirst({ where: { librarianId: session.userId } });
  if (!library) throw new Error("No library found.");

  // 1. Delete all existing seats for this library
  await prisma.seat.deleteMany({
    where: { libraryId: library.id }
  });

  // Filter out EMPTY seats (empty space in grid)
  const activeSeats = seats.filter(s => s.type !== 'EMPTY');

  // Insert new layout
  if (activeSeats.length > 0) {
    const seatData = activeSeats.map(s => ({
      libraryId: library.id,
      name: s.id,
      type: s.type as SeatType,
      gridX: s.x,
      gridY: s.y,
      hasLocker: s.hasLocker || false,
      lockerPriceMonthly: s.hasLocker ? (parseFloat(s.lockerPriceMonthly) || null) : null
    }));

    await prisma.seat.createMany({
      data: seatData
    });
  }

  // 2. Sync Standalone Lockers
  // Delete all existing standalone lockers
  await prisma.standaloneLocker.deleteMany({
    where: { libraryId: library.id }
  });

  // Insert new standalone lockers
  if (standaloneLockers.length > 0) {
    const lockerData = standaloneLockers.map(l => ({
      libraryId: library.id,
      name: l.name,
      price: parseFloat(l.price) || 0
    }));

    await prisma.standaloneLocker.createMany({
      data: lockerData
    });
  }

  revalidatePath("/dashboard/seats");
}

export async function getSeatLayoutAndLockers() {
  const session = await getSession();
  if (!session || session.role !== 'LIBRARIAN') return { seats: [], standaloneLockers: [] };

  const library = await prisma.library.findFirst({
    where: { librarianId: session.userId },
    include: {
      seats: true,
      standaloneLockers: true
    }
  });

  if (!library) return { seats: [], standaloneLockers: [] };

  return {
    seats: library.seats.map(s => ({
      id: s.name,
      x: s.gridX,
      y: s.gridY,
      type: s.type,
      hasLocker: s.hasLocker,
      lockerPriceMonthly: s.lockerPriceMonthly?.toString() || ""
    })),
    standaloneLockers: library.standaloneLockers.map(l => ({
      id: l.id,
      name: l.name,
      price: l.price.toString()
    }))
  };
}
