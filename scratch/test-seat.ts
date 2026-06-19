import prisma from '../src/lib/prisma';
async function main() {
  const lib = await prisma.library.findFirst();
  console.log("Library ID:", lib?.id);
  const seats = await prisma.seat.findMany({ where: { libraryId: lib?.id } });
  console.log("Total seats:", seats.length);
}
main();
