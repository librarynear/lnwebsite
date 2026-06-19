import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  pool: Pool | undefined
}

const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL;

if (!connectionString) {
  throw new Error(
    'Missing DATABASE_URL or DIRECT_URL environment variable. ' +
    'Database connection cannot be established.',
  );
}

const pool = globalForPrisma.pool ?? new Pool({ 
  connectionString,
  max: 3, // Keep max connections low per serverless instance
  idleTimeoutMillis: 10000 
})
const adapter = new PrismaPg(pool)

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })

globalForPrisma.prisma = prisma
globalForPrisma.pool = pool

export default prisma
