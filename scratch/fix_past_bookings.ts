import prisma from '../src/lib/prisma';

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
    const end = new Date(b.endTime);
    
    // Calculate difference in days roughly
    const diffMs = end.getTime() - start.getTime();
    const diffDays = diffMs / (1000 * 3600 * 24);

    // If the difference in days is strictly greater than validityDays (e.g. 1.99 days for a 1 day plan)
    // It means we added validityDays to the start date without subtracting 1.
    // E.g. start: 15th 00:00:00, end: 16th 23:59:59 -> diff is 1.999 days. Plan validity is 1 day.
    // 1.999 > 1
    
    // With new logic: start: 15th 00:00:00, end: 15th 23:59:59 -> diff is 0.999 days.
    // 0.999 < 1
    
    if (diffDays > b.plan.validityDays) {
      toFix.push({
        id: b.id,
        studentName: b.student.name,
        planDays: b.plan.validityDays,
        start: start.toISOString(),
        end: end.toISOString(),
        diffDays: diffDays.toFixed(2),
      });
    }
  }

  console.log(`Found ${toFix.length} bookings to fix.`);
  console.log(toFix.slice(0, 5));

  // Fix them
  for (const b of toFix) {
    const end = new Date(b.end);
    end.setDate(end.getDate() - 1);
    await prisma.booking.update({
      where: { id: b.id },
      data: { endTime: end }
    });
  }
  
  console.log("Fixed all!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
