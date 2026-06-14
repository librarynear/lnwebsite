const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ where: { phone: '+917838004416' } });
  console.log('Kripa users:', users);

  if (users.length > 0) {
    const libraries = await prisma.library.findMany({ where: { librarianId: users[0].id } });
    console.log('Kripa libraries:', libraries.map(l => ({ id: l.id, name: l.name })));
    
    // Check bookings for those libraries
    for (const lib of libraries) {
      const count = await prisma.booking.count({ where: { libraryId: lib.id } });
      console.log(`Library ${lib.name} has ${count} bookings`);
    }
  }
}
main().finally(() => prisma.$disconnect());
