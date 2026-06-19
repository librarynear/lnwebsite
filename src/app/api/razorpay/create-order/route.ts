import { NextResponse, type NextRequest } from 'next/server';
import Razorpay from 'razorpay';
import prisma from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { getSession } from '@/app/actions/auth-actions';

const razorpay = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

function getAppUrl(req: NextRequest): string {
  const env = process.env.NEXT_PUBLIC_APP_URL;
  if (env && !env.includes('localhost')) return env;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000';
  const proto = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

export async function POST(req: NextRequest) {
  try {
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

    const libraryId = plan.libraryId;

    const library = await prisma.library.findUnique({
      where: { id: libraryId },
      select: { name: true },
    });

    if (seatId) {
      const seat = await prisma.seat.findUnique({ where: { id: seatId } });
      if (!seat || seat.libraryId !== libraryId) {
        return NextResponse.json({ error: 'Invalid seat selection' }, { status: 400 });
      }
    }

    if (standaloneLockerId) {
      const locker = await prisma.standaloneLocker.findUnique({ where: { id: standaloneLockerId } });
      if (!locker || locker.libraryId !== libraryId) {
        return NextResponse.json({ error: 'Invalid locker selection' }, { status: 400 });
      }
    }

    // Check seat availability before creating payment link
    if (seatId) {
      const seatClash = await prisma.booking.findFirst({
        where: {
          seatId,
          status: { in: ['CONFIRMED', 'PENDING_PAYMENT'] },
          endTime: { gt: new Date() },
        },
      });
      if (seatClash) {
        return NextResponse.json({ error: 'This seat is no longer available' }, { status: 409 });
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

    if (!Number.isFinite(totalAmount) || totalAmount <= 0 || totalAmount > 1_000_000) {
      return NextResponse.json({ error: 'Invalid order amount' }, { status: 400 });
    }

    const appUrl = getAppUrl(req);
    const refId = `ref_${session.userId.substring(0, 8)}_${Date.now()}`;

    const customerInfo: Record<string, string> = {};
    customerInfo.name = (session as any).name || "Student";
    if (session.phone) customerInfo.contact = session.phone.startsWith('+') ? session.phone : `+91${session.phone}`;
    if (session.email) customerInfo.email = session.email;

    const callbackUrl = `${appUrl}/api/razorpay/callback`;

    if (callbackUrl.includes('localhost')) {
      console.error('[create-order] FATAL: callback_url is localhost — Razorpay will NOT redirect after payment. Set NEXT_PUBLIC_APP_URL to your production domain.');
      return NextResponse.json({ error: 'Payment system is misconfigured. Please contact support.' }, { status: 500 });
    }

    const link = await razorpay.paymentLink.create({
      amount: Math.round(totalAmount * 100),
      currency: "INR",
      accept_partial: false,
      reference_id: refId,
      description: `${plan.name} – ${library?.name || 'Library'}`,
      customer: Object.keys(customerInfo).length > 0 ? customerInfo : undefined,
      callback_url: callbackUrl,
      callback_method: "get",
      notes: {
        planId,
        seatId: seatId || '',
        studentId: session.userId,
        libraryId,
      },
      expire_by: Math.floor(Date.now() / 1000) + 1800,
    } as any);

    const intent = JSON.stringify({
      studentId: session.userId,
      libraryId,
      planId,
      seatId: seatId || null,
      hasLocker: hasLocker || false,
      standaloneLockerId: standaloneLockerId || null,
      orderId: (link as any).order_id || null,
    });

    // Store intent keyed by our reference_id (used by callback GET)
    await redis.set(`razorpay:intent:${refId}`, intent, { ex: 3600 });
    // Also key by the internal order_id so the webhook can find it
    if ((link as any).order_id) {
      await redis.set(`razorpay:intent:${(link as any).order_id}`, intent, { ex: 3600 });
    }

    return NextResponse.json({ payment_url: link.short_url });
  } catch (error: any) {
    console.error("Razorpay error:", error);
    return NextResponse.json({ error: 'An error occurred creating payment' }, { status: 500 });
  }
}
