import prisma from './src/lib/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  const kripa = await prisma.library.findFirst({
    where: { name: 'Kripa Library' },
    include: { plans: true, seats: true }
  });

  const gyan = await prisma.library.findFirst({
    where: { name: 'Gyan Vatika Library' },
    include: { plans: true, seats: true }
  });

  if (!kripa || !gyan) {
    console.error("Libraries not found. Run seed-kripa and seed-gyan first.");
    process.exit(1);
  }

  const hashedPassword = await bcrypt.hash('student123', 10);

  const seedForLibrary = async (library: any, prefix: string) => {
    const defaultPlan = library.plans[0];
    
    for (let i = 1; i <= 10; i++) {
      const email = `${prefix}_student${i}@example.com`;
      
      let user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        user = await prisma.user.create({
          data: {
            name: `${library.name} Student ${i}`,
            email,
            password: hashedPassword,
            role: 'STUDENT',
          }
        });
      }

      // Check if booking already exists for this student in this library to prevent duplicates
      const existingBooking = await prisma.booking.findFirst({
        where: { studentId: user.id, libraryId: library.id }
      });

      if (!existingBooking && defaultPlan) {
        const startTime = new Date();
        const endTime = new Date();
        endTime.setDate(endTime.getDate() + 28); // 1 month plan

        // Assign a random seat if available
        let assignedSeatId = null;
        if (library.seats && library.seats.length > 0) {
            assignedSeatId = library.seats[i % library.seats.length].id;
        }

        await prisma.booking.create({
          data: {
            studentId: user.id,
            libraryId: library.id,
            planId: defaultPlan.id,
            seatId: assignedSeatId,
            startTime,
            endTime,
            status: 'CONFIRMED',
            paymentRef: 'SEED_MOCK_DATA'
          }
        });
      }
    }
  };

  await seedForLibrary(kripa, 'kripa');
  await seedForLibrary(gyan, 'gyan');

  console.log('Successfully seeded 10 students and bookings for each library!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
