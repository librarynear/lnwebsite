import prisma from "@/lib/prisma"
import { notFound } from "next/navigation"
import { LibraryClient } from "./LibraryClient"
import { getSession } from "@/app/actions/auth-actions"
import { redis } from "@/lib/redis"

export default async function LibraryDetailsPage(props: any) {
  const params = await props.params;
  const id = params?.id;

  if (!id) {
    return notFound()
  }

  // 1. Check Redis Cache
  const cacheKey = `library:${id}`;
  let library: any = await redis.get(cacheKey);

  // 2. If not in cache, query Postgres and save to Redis
  if (!library) {
    library = await prisma.library.findUnique({
      where: { id },
      include: {
        plans: true,
        seats: true,
        standaloneLockers: true
      }
    });

    if (library) {
      await redis.set(cacheKey, JSON.stringify(library), { ex: 60 * 60 * 24 }); // Cache for 24h, we will invalidate on update
    }
  } else if (typeof library === 'string') {
    library = JSON.parse(library);
  }

  if (!library) {
    return notFound()
  }

  const session = await getSession();

  let currentPlanEndDate = null;
  let studentActiveBookingId = null;
  if (session?.userId) {
    const studentActiveBooking = await prisma.booking.findFirst({
      where: {
        studentId: session.userId,
        libraryId: library.id,
        status: "CONFIRMED",
        endTime: { gt: new Date() }
      },
      orderBy: { endTime: 'desc' }
    });
    if (studentActiveBooking) {
      currentPlanEndDate = studentActiveBooking.endTime.toISOString();
      studentActiveBookingId = studentActiveBooking.id;
    }
  }

  // Get active bookings to calculate seat availability
  const activeBookings = await prisma.booking.findMany({
    where: {
      libraryId: library.id,
      status: {
        in: ['CONFIRMED', 'COMPLETED']
      },
      endTime: {
        gt: new Date()
      }
    },
    select: {
      id: true,
      seatId: true,
      standaloneLockerId: true
    }
  });

  const occupiedSeatIds = activeBookings
    .filter(b => b.id !== studentActiveBookingId)
    .map(b => b.seatId)
    .filter(Boolean) as string[];
  const occupiedLockerIds = activeBookings.map(b => b.standaloneLockerId).filter(Boolean) as string[];

  // Filter out occupied lockers so they can't be booked
  library.standaloneLockers = library.standaloneLockers.filter((l: any) => !occupiedLockerIds.includes(l.id));

  return <LibraryClient 
    library={library} 
    occupiedSeatIds={occupiedSeatIds} 
    studentId={session?.userId || ""} 
    currentPlanEndDate={currentPlanEndDate} 
    studentPhone={session?.phone || ""}
    studentEmail={session?.email || ""}
  />
}
