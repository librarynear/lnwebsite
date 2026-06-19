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
      // Calculate new timestamps starting from NOW
      const startTime = new Date();
      const endTime = new Date(startTime);
      endTime.setDate(endTime.getDate() + booking.plan.validityDays);

      // Re-check overlap for the seat
      if (booking.seatId) {
        const existingSeatBooking = await tx.booking.findFirst({
          where: {
            seatId: booking.seatId,
            status: "CONFIRMED",
            startTime: { lt: endTime },
            endTime: { gt: startTime }
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
          startTime,
          endTime,
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
