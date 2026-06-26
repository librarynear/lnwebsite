import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.prod' });
import prisma from '../src/lib/prisma';

async function main() {
  const library = await prisma.library.findFirst({
    where: {
      name: {
        contains: 'kripa',
        mode: 'insensitive'
      }
    }
  });

  if (library) {
    console.log(`KRIPA_LIBRARY_ID=${library.id}`);
  } else {
    console.log('Kripa library not found.');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
