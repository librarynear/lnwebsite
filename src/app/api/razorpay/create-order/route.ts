import { NextResponse } from 'next/server';
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
    // Auth check
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { planId, seatId, hasLocker, standaloneLockerId } = await req.json();

    if (typeof planId !== 'string' || !planId) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 });
    }
    if (seatId != null && typeof seatId !== 'string') {
      return NextResponse.json({ error: 'Invalid seat' }, { status: 400 });
    }
    if (standaloneLockerId != null && typeof standaloneLockerId !== 'string') {
      return NextResponse.json({ error: 'Invalid locker' }, { status: 400 });
    }

    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    // Cross-entity validation: verify plan belongs to a library
    const libraryId = plan.libraryId;

    // Validate seat belongs to same library
    if (seatId) {
      const seat = await prisma.seat.findUnique({ where: { id: seatId } });
      if (!seat || seat.libraryId !== libraryId) {
        return NextResponse.json({ error: 'Invalid seat selection' }, { status: 400 });
      }
    }

    // Validate locker belongs to same library
    if (standaloneLockerId) {
      const locker = await prisma.standaloneLocker.findUnique({ where: { id: standaloneLockerId } });
      if (!locker || locker.libraryId !== libraryId) {
        return NextResponse.json({ error: 'Invalid locker selection' }, { status: 400 });
      }
    }

    let planPrice = plan.discount 
      ? plan.price - (plan.price * plan.discount / 100) 
      : plan.price;

    let lockerCost = 0;
    
    if (hasLocker && seatId) {
      const seat = await prisma.seat.findUnique({ where: { id: seatId } });
      if (seat) {
        lockerCost = (seat.lockerPriceMonthly || 0) * (plan.validityDays / 28);
      }
    } else if (standaloneLockerId) {
      // Prevent double booking of standalone lockers (wrapped in transaction for atomicity)
      const existingLockerBooking = await prisma.booking.findFirst({
        where: {
          standaloneLockerId,
          status: { in: ["CONFIRMED"] },
          endTime: { gt: new Date() }
        }
      });
      if (existingLockerBooking) {
        return NextResponse.json({ error: 'This locker has just been reserved by someone else.' }, { status: 409 });
      }

      const locker = await prisma.standaloneLocker.findUnique({ where: { id: standaloneLockerId } });
      if (locker) {
        lockerCost = locker.price * (plan.validityDays / 28);
      }
    }

    const totalAmount = planPrice + lockerCost;

    // Defensive: never create an order for a non-positive / non-finite / absurd
    // amount even if upstream plan data is somehow corrupt.
    if (!Number.isFinite(totalAmount) || totalAmount <= 0 || totalAmount > 1_000_000) {
      return NextResponse.json({ error: 'Invalid order amount' }, { status: 400 });
    }

    const options = {
      amount: Math.round(totalAmount * 100), // amount in paise
      currency: "INR",
      receipt: `rcpt_${session.userId.substring(0, 8)}_${Date.now()}`,
      notes: {
        planId,
        seatId: seatId || '',
        studentId: session.userId,
        libraryId,
      }
    };

    const order = await razorpay.orders.create(options);

    // Persist the booking intent so the post-payment callback can recover it
    // after a UPI intent redirect (which destroys the in-page JS context).
    await redis.set(`razorpay:intent:${order.id}`, JSON.stringify({
      studentId: session.userId,
      libraryId,
      planId,
      seatId: seatId || null,
      hasLocker: hasLocker || false,
      standaloneLockerId: standaloneLockerId || null,
    }), { ex: 3600 });

    return NextResponse.json(order);
  } catch (error: any) {
    console.error("Razorpay error:", error);
    return NextResponse.json({ error: 'An error occurred creating order' }, { status: 500 });
  }
}
