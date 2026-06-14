import { NextResponse } from 'next/server';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import prisma from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { getSession } from '@/app/actions/auth-actions';

const razorpay = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(req: Request) {
  try {
    // 1. Auth check
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      razorpay_payment_id, 
      razorpay_order_id, 
      razorpay_signature,
      studentId,
      libraryId,
      seatId,
      planId,
      hasLocker,
      standaloneLockerId
    } = await req.json();

    // 1b. Basic type validation on identifiers
    if (
      typeof razorpay_payment_id !== 'string' ||
      typeof razorpay_order_id !== 'string' ||
      typeof razorpay_signature !== 'string' ||
      typeof planId !== 'string' ||
      typeof libraryId !== 'string'
    ) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // 2. Verify studentId matches session (prevent impersonation)
    if (studentId !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 3. Verify Razorpay signature
    const secret = process.env.RAZORPAY_KEY_SECRET!;
    const shasum = crypto.createHmac("sha256", secret);
    shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const expectedSignature = shasum.digest("hex");

    if (!crypto.timingSafeEqual(Buffer.from(expectedSignature, 'hex'), Buffer.from(razorpay_signature, 'hex'))) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // Replay attack prevention moved into the serializable transaction below
    // 5. Fetch plan and validate
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    // 6. Cross-entity validation: plan must belong to library
    if (plan.libraryId !== libraryId) {
      return NextResponse.json({ error: 'Invalid plan for this library' }, { status: 400 });
    }

    // 7. Cross-entity validation: seat must belong to library
    if (seatId) {
      const seat = await prisma.seat.findUnique({ where: { id: seatId } });
      if (!seat || seat.libraryId !== libraryId) {
        return NextResponse.json({ error: 'Invalid seat for this library' }, { status: 400 });
      }
    }

    // 8. Cross-entity validation: locker must belong to library
    if (standaloneLockerId) {
      const locker = await prisma.standaloneLocker.findUnique({ where: { id: standaloneLockerId } });
      if (!locker || locker.libraryId !== libraryId) {
        return NextResponse.json({ error: 'Invalid locker for this library' }, { status: 400 });
      }
    }

    // 9. Server-side amount validation — fetch actual Razorpay order and compare with plan price
    let expectedAmount = plan.discount 
      ? plan.price - (plan.price * plan.discount / 100) 
      : plan.price;
    
    // Add locker cost
    if (hasLocker && seatId) {
      const seat = await prisma.seat.findUnique({ where: { id: seatId } });
      if (seat && seat.lockerPriceMonthly) {
        expectedAmount += seat.lockerPriceMonthly * (plan.validityDays / 28);
      }
    } else if (standaloneLockerId) {
      const locker = await prisma.standaloneLocker.findUnique({ where: { id: standaloneLockerId } });
      if (locker) {
        expectedAmount += locker.price * (plan.validityDays / 28);
      }
    }

    const expectedAmountPaise = Math.round(expectedAmount * 100);

    const payment = await razorpay.payments.fetch(razorpay_payment_id);
    const paidAmountPaise = Number(payment.amount);

    // Exact comparison with 1 paisa tolerance to prevent money leaks
    if (Math.abs(paidAmountPaise - expectedAmountPaise) > 1) {
      return NextResponse.json({ error: 'Payment amount mismatch' }, { status: 400 });
    }

    if (payment.status === 'authorized') {
      try {
        await razorpay.payments.capture(razorpay_payment_id, paidAmountPaise, "INR");
      } catch (err) {
        console.error("Capture failed:", err);
        return NextResponse.json({ error: 'Failed to capture payment' }, { status: 500 });
      }
    } else if (payment.status !== 'captured') {
      return NextResponse.json({ error: 'Payment invalid or failed' }, { status: 400 });
    }

    // 10. Atomic booking creation with serializable transaction to prevent race conditions
    const booking = await prisma.$transaction(async (tx) => {
      // Replay attack prevention inside serializable tx
      const existingPayment = await tx.booking.findFirst({
        where: { paymentRef: razorpay_order_id }
      });
      if (existingPayment) {
        throw new Error("PAYMENT_ALREADY_PROCESSED");
      }

      // Check for existing active booking (extension logic)
      const activeBooking = await tx.booking.findFirst({
        where: {
          studentId,
          libraryId,
          status: "CONFIRMED",
          endTime: { gt: new Date() }
        },
        orderBy: { endTime: 'desc' }
      });

      const startTime = activeBooking ? new Date(activeBooking.endTime) : new Date();
      const endTime = new Date(startTime);
      endTime.setDate(endTime.getDate() + plan.validityDays);

      // Check for existing seat booking (double-booking prevention). For
      // extensions, the student's own current booking ends exactly when the
      // new booking starts, so it is not treated as an overlap.
      if (seatId) {
        const existingSeatBooking = await tx.booking.findFirst({
          where: {
            seatId,
            status: { in: ["CONFIRMED", "PENDING_PAYMENT"] },
            startTime: { lt: endTime },
            endTime: { gt: startTime }
          }
        });
        if (existingSeatBooking) {
          throw new Error("SEAT_TAKEN");
        }
      }

      // Check for standalone locker double booking
      if (standaloneLockerId) {
        const existingLockerBooking = await tx.booking.findFirst({
          where: {
            standaloneLockerId,
            status: { in: ["CONFIRMED", "PENDING_PAYMENT"] },
            endTime: { gt: new Date() }
          }
        });
        if (existingLockerBooking) {
          throw new Error("LOCKER_TAKEN");
        }
      }

      return await tx.booking.create({
        data: {
          studentId,
          libraryId,
          seatId,
          planId,
          paymentRef: razorpay_order_id,
          hasLocker: hasLocker || false,
          standaloneLockerId: standaloneLockerId || null,
          startTime,
          endTime,
          status: "CONFIRMED"
        }
      });
    }, { isolationLevel: 'Serializable' });

    await redis.del(`library:${libraryId}`);

    return NextResponse.json({ success: true, booking });
  } catch (error: any) {
    console.error("Razorpay Verify Error:", error);
    
    if (error.message === "PAYMENT_ALREADY_PROCESSED") {
      return NextResponse.json({ error: 'Payment already processed' }, { status: 409 });
    }
    if (error.message === "SEAT_TAKEN") {
      return NextResponse.json({ error: 'This seat has just been reserved by someone else.' }, { status: 409 });
    }
    if (error.message === "LOCKER_TAKEN") {
      return NextResponse.json({ error: 'This locker has just been reserved by someone else.' }, { status: 409 });
    }

    return NextResponse.json({ error: 'An error occurred verifying payment' }, { status: 500 });
  }
}
