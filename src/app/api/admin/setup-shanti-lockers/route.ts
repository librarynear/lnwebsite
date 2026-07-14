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

    // Clean up existing lockers first to avoid duplicates
    await prisma.standaloneLocker.deleteMany({
      where: { libraryId: library.id }
    });

    const lockersData = [];

    // 1 to 30 for Rs. 150
    for (let i = 1; i <= 30; i++) {
      lockersData.push({ libraryId: library.id, name: i.toString(), price: 150 });
    }

    // 41 to 70 for Rs. 100
    for (let i = 41; i <= 70; i++) {
      lockersData.push({ libraryId: library.id, name: i.toString(), price: 100 });
    }

    let updatedCount = 0;
    let createdCount = 0;

    await Promise.all(lockersData.map(async (locker) => {
      const existing = await prisma.standaloneLocker.findFirst({
        where: { libraryId: library.id, name: locker.name }
      });

      if (existing) {
        await prisma.standaloneLocker.update({
          where: { id: existing.id },
          data: locker
        });
        updatedCount++;
      } else {
        await prisma.standaloneLocker.create({
          data: locker
        });
        createdCount++;
      }
    }));

    return NextResponse.json({ 
      success: true, 
      message: `Updated ${updatedCount} lockers, Created ${createdCount} new standalone lockers for ${library.name}.`
    });

  } catch (error: any) {
    console.error("Error setting up Shanti library lockers:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
