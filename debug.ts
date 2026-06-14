import prisma from './src/lib/prisma';

async function main() {
  const kripa = await prisma.library.findFirst({
    where: { name: { contains: 'Kripa' } }
  });
  console.log('Kripa Library ID:', kripa?.id);

  const bookings = await prisma.booking.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
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
