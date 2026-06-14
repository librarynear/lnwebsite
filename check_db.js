const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const bookings = await prisma.booking.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      student: true,
      library: true,
      plan: true
    }
  });

  console.log(JSON.stringify(bookings.map(b => ({
    id: b.id,
    library: b.library?.name,
    student: b.student?.name,
    plan: b.plan?.name,
    status: b.status,
    createdAt: b.createdAt
  })), null, 2));
}

main().finally(() => prisma.$disconnect());
