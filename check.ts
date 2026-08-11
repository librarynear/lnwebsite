import 'dotenv/config';
import { prisma } from './src/lib/prisma';

async function main() {
  const user = await prisma.user.findFirst({
    where: { phone: { contains: '9119065339' } },
    include: { bookings: { include: { plan: true } } }
  });
  console.dir(user?.bookings, { depth: null });
}
main().catch(console.error).finally(() => prisma.$disconnect());
