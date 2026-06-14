import { NextResponse } from 'next/server';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import prisma from '@/lib/prisma';
import { redis } from '@/lib/redis';

const razorpay = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

/**
 * Razorpay redirects the browser here (POST with form-encoded body) after a
 * successful payment via UPI intent or any redirect-based method.
 *
 * The session cookie may be absent (SameSite=lax blocks cross-site POSTs), so
 * we authenticate via the Razorpay signature + the Redis-stored booking intent
 * instead of getSession().
 */
export async function POST(req: Request) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  try {
    const formData = await req.formData();
    const razorpay_payment_id = formData.get('razorpay_payment_id') as string | null;
    const razorpay_order_id = formData.get('razorpay_order_id') as string | null;
    const razorpay_signature = formData.get('razorpay_signature') as string | null;

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return NextResponse.redirect(`${appUrl}/?payment=error`, { status: 303 });
    }

    // 1. Verify Razorpay signature
    const secret = process.env.RAZORPAY_KEY_SECRET!;
    const expected = crypto
      .createHmac('sha256', secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(razorpay_signature as string, 'hex'))) {
      return NextResponse.redirect(`${appUrl}/?payment=invalid`, { status: 303 });
    }

    // 2. Retrieve the booking intent we stored when the order was created
    const intentKey = `razorpay:intent:${razorpay_order_id}`;
    const raw = await redis.get(intentKey);
    if (!raw) {
      return NextResponse.redirect(`${appUrl}/?payment=expired`, { status: 303 });
    }
    const intent = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const { studentId, libraryId, planId, seatId, hasLocker, standaloneLockerId } = intent as {
      studentId: string;
      libraryId: string;
      planId: string;
      seatId: string | null;
      hasLocker: boolean;
      standaloneLockerId: string | null;
    };

    // 4. Fetch plan + cross-entity validation
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan || plan.libraryId !== libraryId) {
      return NextResponse.redirect(`${appUrl}/?payment=error`, { status: 303 });
    }

    if (seatId) {
      const seat = await prisma.seat.findUnique({ where: { id: seatId } });
      if (!seat || seat.libraryId !== libraryId) {
        return NextResponse.redirect(`${appUrl}/?payment=error`, { status: 303 });
      }
    }

    if (standaloneLockerId) {
      const locker = await prisma.standaloneLocker.findUnique({ where: { id: standaloneLockerId } });
      if (!locker || locker.libraryId !== libraryId) {
        return NextResponse.redirect(`${appUrl}/?payment=error`, { status: 303 });
      }
    }

    // 5. Server-side amount validation
    let expectedAmount = plan.discount
      ? plan.price - (plan.price * plan.discount) / 100
      : plan.price;

    if (hasLocker && seatId) {
      const seat = await prisma.seat.findUnique({ where: { id: seatId } });
      if (seat?.lockerPriceMonthly) {
        expectedAmount += seat.lockerPriceMonthly * (plan.validityDays / 28);
      }
    } else if (standaloneLockerId) {
      const locker = await prisma.standaloneLocker.findUnique({ where: { id: standaloneLockerId } });
      if (locker) {
        expectedAmount += locker.price * (plan.validityDays / 28);
      }
    }

    const expectedPaise = Math.round(expectedAmount * 100);

    const payment = await razorpay.payments.fetch(razorpay_payment_id as string);
    const paidPaise = Number(payment.amount);

    if (Math.abs(paidPaise - expectedPaise) > 1) {
      return NextResponse.redirect(`${appUrl}/?payment=mismatch`, { status: 303 });
    }

    if (payment.status === 'authorized') {
      try {
        await razorpay.payments.capture(razorpay_payment_id as string, paidPaise, "INR");
      } catch (err) {
        console.error("Payment capture failed in callback:", err);
        return NextResponse.redirect(`${appUrl}/?payment=error`, { status: 303 });
      }
    } else if (payment.status !== 'captured') {
      return NextResponse.redirect(`${appUrl}/?payment=invalid`, { status: 303 });
    }

    // 6. Atomic booking creation (same logic as verify route)
    await prisma.$transaction(async (tx) => {
      // Replay attack prevention moved into serializable transaction
      const existing = await tx.booking.findFirst({
        where: { paymentRef: razorpay_order_id as string },
      });
      if (existing) {
        throw new Error('PAYMENT_ALREADY_PROCESSED');
      }

      const activeBooking = await tx.booking.findFirst({
        where: { studentId, libraryId, status: 'CONFIRMED', endTime: { gt: new Date() } },
        orderBy: { endTime: 'desc' },
      });

      const startTime = activeBooking ? new Date(activeBooking.endTime) : new Date();
      const endTime = new Date(startTime);
      endTime.setDate(endTime.getDate() + plan.validityDays);

      if (seatId) {
        const clash = await tx.booking.findFirst({
          where: {
            seatId,
            status: { in: ['CONFIRMED', 'PENDING_PAYMENT'] },
            startTime: { lt: endTime },
            endTime: { gt: startTime },
          },
        });
        if (clash) throw new Error('SEAT_TAKEN');
      }

      if (standaloneLockerId) {
        const clash = await tx.booking.findFirst({
          where: {
            standaloneLockerId,
            status: { in: ['CONFIRMED', 'PENDING_PAYMENT'] },
            endTime: { gt: new Date() },
          },
        });
        if (clash) throw new Error('LOCKER_TAKEN');
      }

      return tx.booking.create({
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
          status: 'CONFIRMED',
        },
      });
    }, { isolationLevel: 'Serializable' });

    // 7. Clean up
    await redis.del(intentKey);
    await redis.del(`library:${libraryId}`);

    return NextResponse.redirect(
      `${appUrl}/student/dashboard?booking=success&library=${libraryId}`,
      { status: 303 },
    );
  } catch (error: any) {
    console.error('Razorpay callback error:', error);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    if (error.message === 'PAYMENT_ALREADY_PROCESSED') {
      return NextResponse.redirect(
        `${appUrl}/student/dashboard?booking=success`,
        { status: 303 },
      );
    }
    if (error.message === 'SEAT_TAKEN') {
      return NextResponse.redirect(`${appUrl}/?payment=seat_taken`, { status: 303 });
    }
    if (error.message === 'LOCKER_TAKEN') {
      return NextResponse.redirect(`${appUrl}/?payment=locker_taken`, { status: 303 });
    }

    return NextResponse.redirect(`${appUrl}/?payment=error`, { status: 303 });
  }
}
