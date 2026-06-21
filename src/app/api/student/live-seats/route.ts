import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/app/actions/auth-actions';

export async function GET(req: Request) {
  const session = await getSession();
  const { searchParams } = new URL(req.url);
  const libraryId = searchParams.get('libraryId');

  try {
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!libraryId) {
      return NextResponse.json({ error: 'Missing libraryId' }, { status: 400 });
    }

    const library = await prisma.library.findUnique({
      where: { id: libraryId },
      include: {
        seats: true,
      }
    });

    if (!library) {
      return NextResponse.json({ error: 'Library not found' }, { status: 404 });
    }

    // Get currently occupied seats
    const now = new Date();
    const activeBookings = await prisma.booking.findMany({
      where: {
        libraryId,
        status: { in: ['CONFIRMED', 'PENDING_PAYMENT'] },
        endTime: { gt: now }
      },
      select: {
        seatId: true,
      }
    });

    const occupiedSeatIds = activeBookings
      .map(b => b.seatId)
      .filter(Boolean) as string[];

    return NextResponse.json({
      library,
      occupiedSeatIds
    });
  } catch (error) {
    console.error("Live seats fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
