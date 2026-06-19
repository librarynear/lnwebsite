import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.development.local' });

async function run() {
  const { default: prisma } = await import('../src/lib/prisma');
  const lib = await prisma.library.findFirst({ where: { name: 'Kripa Library' } });
  if (!lib) {
    console.log("Kripa Library not found!");
    return;
  }
  const seats = await prisma.seat.findMany({ where: { libraryId: lib.id }, orderBy: [{ gridY: 'asc' }, { gridX: 'asc' }] });
  console.log(`Found ${seats.length} seats for Kripa Library.`);
  if (seats.length > 0) {
    console.log("First 5 seats:", seats.slice(0, 5));
    console.log("Max gridX:", Math.max(...seats.map(s => s.gridX)));
    console.log("Max gridY:", Math.max(...seats.map(s => s.gridY)));
  }
}
run().catch(console.error).finally(() => process.exit(0));
