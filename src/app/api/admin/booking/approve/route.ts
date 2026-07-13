import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/app/actions/auth-actions";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'LIBRARIAN' && session.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { bookingId, paymentMethod } = await req.json();

    if (!bookingId || !paymentMethod) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { plan: true, library: true }
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (session.role === 'LIBRARIAN' && booking.library.librarianId !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (booking.status !== 'PENDING_PAYMENT') {
      return NextResponse.json({ error: 'Booking is not pending' }, { status: 400 });
    }

    // Atomic transaction to ensure seat isn't stolen by someone else during approval
    const updatedBooking = await prisma.$transaction(async (tx) => {
      // Re-check overlap for the seat using the originally requested dates
      if (booking.seatId) {
        const existingSeatBooking = await tx.booking.findFirst({
          where: {
            seatId: booking.seatId,
            status: "CONFIRMED",
            startTime: { lt: booking.endTime },
            endTime: { gt: booking.startTime }
          }
        });
        if (existingSeatBooking) {
          throw new Error("SEAT_TAKEN");
        }
      }

      return await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: "CONFIRMED",
          paymentRef: `RECEPTION_${paymentMethod}_${Date.now()}`
        }
      });
    }, { isolationLevel: 'Serializable' });

    return NextResponse.json({ success: true, booking: updatedBooking });
  } catch (error: any) {
    console.error("Booking Approval Error:", error);
    if (error.message === "SEAT_TAKEN") {
      return NextResponse.json({ error: 'Seat has been confirmed by someone else while pending.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
