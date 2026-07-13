import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const library = await prisma.library.findFirst({
      where: {
        name: {
          contains: "shanti",
          mode: "insensitive"
        }
      }
    });

    if (!library) {
      return NextResponse.json({ error: "Shanti Library not found!" }, { status: 404 });
    }

    const COLS = 10;
    let currentIndex = 0;
    const seatsData = [];

    // 1 to 87: Reservable (NORMAL)
    for (let i = 1; i <= 87; i++) {
      seatsData.push({
        libraryId: library.id,
        name: i.toString(),
        type: "NORMAL" as any,
        gridX: currentIndex % COLS,
        gridY: Math.floor(currentIndex / COLS),
        hasLocker: false,
        lockerPriceMonthly: null,
        premiumPriceMonthly: null,
        syncPremiumOffers: true,
      });
      currentIndex++;
    }

    // 101 to 119: Premium with 200 extra charge and locker of price 100
    for (let i = 101; i <= 119; i++) {
      seatsData.push({
        libraryId: library.id,
        name: i.toString(),
        type: "PREMIUM" as any,
        gridX: currentIndex % COLS,
        gridY: Math.floor(currentIndex / COLS),
        hasLocker: true,
        lockerPriceMonthly: 100,
        premiumPriceMonthly: 200,
        syncPremiumOffers: true,
      });
      currentIndex++;
    }

    // 120 to 143: Premium with 300 extra charge and no locker
    for (let i = 120; i <= 143; i++) {
      seatsData.push({
        libraryId: library.id,
        name: i.toString(),
        type: "PREMIUM" as any,
        gridX: currentIndex % COLS,
        gridY: Math.floor(currentIndex / COLS),
        hasLocker: false,
        lockerPriceMonthly: null,
        premiumPriceMonthly: 300,
        syncPremiumOffers: true,
      });
      currentIndex++;
    }

    let updatedCount = 0;
    let createdCount = 0;

    for (const seat of seatsData) {
      const existing = await prisma.seat.findFirst({
        where: { libraryId: library.id, name: seat.name }
      });

      if (existing) {
        await prisma.seat.update({
          where: { id: existing.id },
          data: seat
        });
        updatedCount++;
      } else {
        await prisma.seat.create({
          data: seat
        });
        createdCount++;
      }
    }

    await prisma.library.update({
      where: { id: library.id },
      data: { 
        compactSeatMap: true,
        seatNaming: "NUMERIC"
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: `Updated ${updatedCount} seats, Created ${createdCount} new seats for ${library.name}.`
    });

  } catch (error: any) {
    console.error("Error setting up Shanti library seats:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
