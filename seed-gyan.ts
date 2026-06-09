import prisma from './src/lib/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  const email = 'gyan@library.com';
  let user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    const hashedPassword = await bcrypt.hash('password123', 10);
    user = await prisma.user.create({
      data: {
        name: 'Gyan Vatika Admin',
        email,
        password: hashedPassword,
        role: 'LIBRARIAN',
      }
    });
  }

  // Delete existing library if any for this user to avoid conflicts
  await prisma.library.deleteMany({ where: { librarianId: user.id } });

  const library = await prisma.library.create({
    data: {
      librarianId: user.id,
      name: 'Gyan Vatika Library',
      managerName: 'Gyan Vatika Admin',
      managerPhone: '7210042731',
      address: '2nd Floor, No.-2&3, B-13, near Govt. School, Chander Vihar, Mandawali, Delhi, 110092',
      locality: 'Chander Vihar',
      city: 'Delhi',
      state: 'Delhi',
      pinCode: '110092',
      metroStation: 'Mandawali - West Vinod Nagar',
      metroDistance: 1.02,
      openingTime: '10:00',
      closingTime: '23:00',
      whatsapp: '7210042731',
      description: 'The library I visited is an excellent place for reading, learning, and peaceful study. It provides a quiet and organized environment, ideal for students and knowledge seekers.',
      seatsAvailable: 79,
      facilities: ['AC', 'Wi-Fi', 'RO Water', 'Washroom', 'CCTV', 'Locker', 'Parking', 'Tea/Coffee', 'Security Guard', 'Charging Points', 'Silent Zone'],
      photos: [] // Empty so the user can upload them
    }
  });

  // Create Plans
  await prisma.plan.createMany({
    data: [
      {
        libraryId: library.id,
        name: '6 hrs Plan',
        type: 'FLEXIBLE',
        durationHours: 6,
        validityDays: 28,
        price: 600,
      },
      {
        libraryId: library.id,
        name: '8 hrs Plan',
        type: 'FLEXIBLE',
        durationHours: 8,
        validityDays: 28,
        price: 800,
      },
      {
        libraryId: library.id,
        name: '10 hrs Plan',
        type: 'FLEXIBLE',
        durationHours: 10,
        validityDays: 28,
        price: 900,
      },
      {
        libraryId: library.id,
        name: '12 hrs Plan',
        type: 'FLEXIBLE',
        durationHours: 12,
        validityDays: 28,
        price: 1000,
      },
      {
        libraryId: library.id,
        name: '24 hrs Reserved',
        type: 'FIXED',
        durationHours: null,
        validityDays: 28,
        price: 1200,
      }
    ]
  });

  console.log('Gyan Vatika Library seeded successfully!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
