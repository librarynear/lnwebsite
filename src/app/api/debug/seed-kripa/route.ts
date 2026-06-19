import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const kripa = await prisma.library.findFirst({
      where: { name: { contains: 'Kripa' } }
    });

    if (!kripa) {
      return NextResponse.json({ error: 'Kripa library not found' }, { status: 404 });
    }

    // Delete existing standalone lockers
    await prisma.standaloneLocker.deleteMany({
      where: { libraryId: kripa.id }
    });

    const lockersToCreate: any[] = [];
    const libId = kripa.id;

    for (let i = 1; i <= 96; i++) {
      lockersToCreate.push({
        libraryId: libId,
        name: `LOCKER ${i}`,
        price: 100
      });
    }

    await prisma.standaloneLocker.createMany({ data: lockersToCreate });

    return NextResponse.json({ 
      success: true, 
      message: `Created ${lockersToCreate.length} standalone lockers for Kripa Library.`,
      lockers: lockersToCreate 
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
