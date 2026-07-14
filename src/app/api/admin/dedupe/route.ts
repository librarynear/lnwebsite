import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";



export async function GET() {
  try {
    const seats = await prisma.seat.findMany({
      orderBy: { createdAt: 'asc' }
    });

    const seen = new Set();
    const duplicates = [];

    for (const seat of seats) {
      const key = `${seat.libraryId}-${seat.name}`;
      if (seen.has(key)) {
        duplicates.push(seat.id);
      } else {
        seen.add(key);
      }
    }

    if (duplicates.length > 0) {
      await prisma.seat.deleteMany({
        where: { id: { in: duplicates } }
      });
    }

    const lockers = await prisma.standaloneLocker.findMany({
      orderBy: { createdAt: 'asc' }
    });

    const seenLockers = new Set();
    const duplicateLockers = [];

    for (const locker of lockers) {
      const key = `${locker.libraryId}-${locker.name}`;
      if (seenLockers.has(key)) {
        duplicateLockers.push(locker.id);
      } else {
        seenLockers.add(key);
      }
    }

    if (duplicateLockers.length > 0) {
      await prisma.standaloneLocker.deleteMany({
        where: { id: { in: duplicateLockers } }
      });
    }

    return NextResponse.json({ 
      success: true, 
      dedupedSeats: duplicates.length,
      dedupedLockers: duplicateLockers.length
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
