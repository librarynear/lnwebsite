import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  const bookings = await prisma.booking.findMany({
    include: {
      plan: true,
      student: true,
    }
  });

  let toFix = [];

  for (const b of bookings) {
    if (!b.plan) continue;

    const start = new Date(b.startTime);
    const expectedEnd = new Date(b.startTime);
    expectedEnd.setDate(expectedEnd.getDate() + b.plan.validityDays - 1);
    expectedEnd.setHours(23, 59, 59, 999);
    
    const actualEnd = new Date(b.endTime);

    // If the actual end time differs by more than 1 minute from what we expect
    if (Math.abs(expectedEnd.getTime() - actualEnd.getTime()) > 60000) {
      toFix.push({
        id: b.id,
        expectedEnd
      });
    }
  }

  // Fix them
  let fixedCount = 0;
  for (const b of toFix) {
    await prisma.booking.update({
      where: { id: b.id },
      data: { endTime: b.expectedEnd }
    });
    fixedCount++;
  }
  
  return NextResponse.json({
    message: `Fixed ${fixedCount} bookings`,
    fixed: toFix
  });
}
