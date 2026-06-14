import prisma from './src/lib/prisma';

async function run() {
  const targets = [
    { name: 'Kripa', phone: '+917838004416' },
    { name: 'Shanti', phone: '+919873591122' },
    { name: 'Gyan Vatika', phone: '+917210042731' }
  ];

  for (const t of targets) {
    const libs = await prisma.library.findMany({
      where: { name: { contains: t.name, mode: 'insensitive' } },
      include: { librarian: true }
    });

    if (libs.length > 0) {
      console.log(`Found library for ${t.name}: ${libs[0].name}`);
      const ownerId = libs[0].ownerId || libs[0].librarianId;
      if (ownerId) {
        // Clear any existing user with this phone to avoid unique constraint
        await prisma.user.updateMany({
           where: { phone: t.phone },
           data: { phone: t.phone + '_old' }
        });

        await prisma.user.update({
          where: { id: ownerId },
          data: { phone: t.phone, role: 'LIBRARIAN' }
        });
        console.log(`Updated librarian for ${libs[0].name} to phone ${t.phone}`);
      }
    } else {
      console.log(`Could not find library for ${t.name}`);
    }
  }
}

run().finally(() => prisma.$disconnect());
