import { Redis } from '@upstash/redis';
import prisma from './prisma';

// Create a singleton instance
const globalForRedis = global as unknown as { redis: Redis };

export const redis =
  globalForRedis.redis ||
  new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis;

/**
 * Delete keys matching a glob pattern using SCAN (non-blocking) instead of
 * KEYS (which scans the whole keyspace and blocks Redis under load).
 */
export async function deleteByPattern(pattern: string): Promise<void> {
  let cursor = '0';
  do {
    const [next, keys] = (await redis.scan(cursor, { match: pattern, count: 200 })) as [string, string[]];
    cursor = next;
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } while (cursor !== '0');
}

export async function getCachedStudents(libraryId: string) {
  const cacheKey = `library_students:${libraryId}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      // Upstash parses the JSON automatically
      return Array.isArray(cached) ? cached : (cached as any).data || cached;
    }
  } catch (e) {
    console.warn("Redis get error:", e);
  }

  // Fallback to Prisma
  const students = await prisma.user.findMany({
    where: { bookings: { some: { libraryId } } },
    include: {
      bookings: {
        where: { libraryId },
        orderBy: { createdAt: 'desc' },
        include: { plan: true, standaloneLocker: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  const bookings = students.flatMap(s => s.bookings.map(b => ({ ...b, student: { ...s, bookings: undefined } })));

  try {
    await redis.setex(cacheKey, 3600, bookings); // Cache for 1 hour
  } catch (e) {
    console.warn("Redis set error:", e);
  }

  return bookings;
}

export async function invalidateLibraryCache(libraryId: string) {
  try {
    await redis.del(`library_students:${libraryId}`);
  } catch (e) {
    console.warn("Redis del error:", e);
  }
}
