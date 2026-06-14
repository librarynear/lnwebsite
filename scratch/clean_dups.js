const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const kripaLibs = await prisma.library.findMany({ where: { name: { contains: 'Kripa' } } });
  console.log('Kripa Libraries:', kripaLibs.map(l => ({ id: l.id, name: l.name, librarianId: l.librarianId })));

  if (kripaLibs.length > 1) {
    const keep = kripaLibs[0];
    const drop = kripaLibs.slice(1);
    for (const lib of drop) {
      console.log(`Migrating data from ${lib.id} to ${keep.id}`);
      
      // Migrate plans
      await prisma.plan.updateMany({ where: { libraryId: lib.id }, data: { libraryId: keep.id } });
      
      // Migrate seats
      await prisma.seat.updateMany({ where: { libraryId: lib.id }, data: { libraryId: keep.id } });
      
      // Migrate lockers
      await prisma.standaloneLocker.updateMany({ where: { libraryId: lib.id }, data: { libraryId: keep.id } });
      
      // Migrate bookings
      await prisma.booking.updateMany({ where: { libraryId: lib.id }, data: { libraryId: keep.id } });
      
      // Delete old library
      await prisma.library.delete({ where: { id: lib.id } });
      console.log(`Deleted duplicate library ${lib.id}`);
    }
  } else {
    console.log('No duplicates found for Kripa');
  }
}

main().finally(() => prisma.$disconnect());
