import prisma from '../src/lib/prisma';
import fs from 'fs';

async function main() {
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
    const logStr = `Booking ID: ${b.id}\nPlan validityDays: ${b.plan.validityDays}\nStart time: ${start.toISOString()}\nActual End: ${actualEnd.toISOString()}\nExpected:   ${expectedEnd.toISOString()}\nDiff ms:    ${Math.abs(expectedEnd.getTime() - actualEnd.getTime())}\n---\n`;
    fs.appendFileSync('scratch/log2.txt', logStr);

    // If the actual end time differs by more than 1 minute from what we expect
    if (Math.abs(expectedEnd.getTime() - actualEnd.getTime()) > 60000) {
      toFix.push({
        id: b.id,
        expectedEnd
      });
    }
  }

  console.log(`Found ${toFix.length} bookings to fix.`);

  // Fix them
  let fixedCount = 0;
  for (const b of toFix) {
    await prisma.booking.update({
      where: { id: b.id },
      data: { endTime: b.expectedEnd }
    });
    fixedCount++;
  }
  
  console.log(`Fixed ${fixedCount} bookings.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
