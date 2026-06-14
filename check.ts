import { prisma } from './src/lib/prisma';

async function run() {
  const users = await prisma.user.findMany({ where: { phone: { contains: '78380' } } });
  console.log(users);
}

run().finally(() => process.exit(0));
