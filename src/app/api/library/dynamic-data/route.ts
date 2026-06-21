import { getSession } from "@/app/actions/auth-actions";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const libraryId = searchParams.get("libraryId");

  try {
    if (!libraryId) {
      return NextResponse.json({ error: "Missing libraryId" }, { status: 400 });
    }

    const session = await getSession();

    let currentPlanEndDate = null;
    let studentActiveBookingId = null;

    if (session?.userId) {
      const studentActiveBooking = await prisma.booking.findFirst({
        where: {
          studentId: session.userId,
          libraryId: libraryId,
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

    const activeBookingsCacheKey = `library:${libraryId}:active_bookings`;
    let activeBookings: any = await redis.get(activeBookingsCacheKey);

    if (!activeBookings) {
      activeBookings = await prisma.booking.findMany({
        where: {
          libraryId: libraryId,
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
      await redis.set(activeBookingsCacheKey, JSON.stringify(activeBookings), { ex: 15 });
    } else if (typeof activeBookings === 'string') {
      activeBookings = JSON.parse(activeBookings);
    }

    const occupiedSeatIds = activeBookings
      .filter((b: any) => b.id !== studentActiveBookingId)
      .map((b: any) => b.seatId)
      .filter(Boolean) as string[];

    const occupiedLockerIds = activeBookings
      .map((b: any) => b.standaloneLockerId)
      .filter(Boolean) as string[];

    return NextResponse.json({
      session: session ? {
        userId: session.userId,
        phone: session.phone,
        email: session.email
      } : null,
      occupiedSeatIds,
      occupiedLockerIds,
      currentPlanEndDate,
      studentActiveBookingId
    });

  } catch (error: any) {
    console.error("Dynamic data fetch error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
