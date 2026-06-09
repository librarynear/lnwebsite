import prisma from './src/lib/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  const email = 'kripa@library.com';
  let user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    const hashedPassword = await bcrypt.hash('password123', 10);
    user = await prisma.user.create({
      data: {
        name: 'Kripa Admin',
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
      name: 'Kripa Library',
      managerName: 'Kripa Admin',
      managerPhone: '7838004416',
      address: 'ground floor, pandit mohalla, 168, in front of Durga Mandir, Railway Colony, Mandawali, Delhi, 110092',
      locality: 'Mandawali',
      city: 'Delhi',
      state: 'Delhi',
      pinCode: '110092',
      openingTime: '06:00',
      closingTime: '21:00',
      whatsapp: '7838004416',
      description: 'Kripa library is best for students want to study comfortably without any distractions as well as spacious cubicles and most comfortable chairs equipped with all facilities require for study. Positive study environment and good free parking space for students',
      seatsAvailable: 180,
      facilities: ['AC', 'Wi-Fi', 'RO Water', 'Washroom', 'Power Backup', 'CCTV', 'Locker', 'Parking', 'Tea/Coffee', 'Charging Points', 'Silent Zone'],
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

  console.log('Kripa Library seeded successfully!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
