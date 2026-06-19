import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.development.local' });

async function run() {
  const { default: prisma } = await import('../src/lib/prisma');
  const libs = await prisma.library.findMany({ select: { id: true, name: true } });
  console.log(libs);
}
run().catch(console.error).finally(() => process.exit(0));
