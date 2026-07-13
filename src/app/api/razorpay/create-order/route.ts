import { NextResponse, type NextRequest } from 'next/server';
import Razorpay from 'razorpay';
import prisma from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { getSession } from '@/app/actions/auth-actions';

// Lazily construct the client so a missing key fails loudly at request time
// instead of silently signing requests with placeholder creds (which produces
// confusing downstream Razorpay auth errors). Keeping it out of module scope
// also avoids the constructor throwing during build-time page-data collection.
function getRazorpayClient(): Razorpay {
  const key_id = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) {
    throw new Error('Razorpay keys are not configured (NEXT_PUBLIC_RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET)');
  }
  return new Razorpay({ key_id, key_secret });
}

function getAppUrl(req: NextRequest): string {
  const env = process.env.NEXT_PUBLIC_APP_URL;
  if (env && !env.includes('localhost')) return env;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000';
  const proto = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

import { adminAuth } from '@/lib/firebase/firebaseAdmin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { planId, seatId, hasLocker, standaloneLockerId, idToken } = body;

    let session = await getSession();
    let authUserId = session?.userId;
    let authUser: any = session || null;

    if (!session && idToken && adminAuth) {
      try {
        const decoded = await adminAuth.verifyIdToken(idToken);
        const user = await prisma.user.findUnique({ where: { authId: decoded.uid } });
        if (user) {
          authUserId = user.id;
          authUser = user;
        }
      } catch (e) {
        console.error("Iframe token verification failed", e);
      }
    }

    if (!authUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
    if (!plan || !plan.isActive) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const libraryId = plan.libraryId;

    const lastBooking = await prisma.booking.findFirst({
      where: { studentId: authUserId, libraryId },
      orderBy: { createdAt: 'desc' }
    });
    
    if (lastBooking && lastBooking.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Your access to this library has been revoked. Please contact the librarian.' }, { status: 403 });
    }

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
    let premiumSurcharge = 0;
    const lockerMonths = Math.max(1, Math.round(plan.validityDays / 28));

    if (seatId) {
      const seat = await prisma.seat.findUnique({ where: { id: seatId } });
      if (seat) {
        if (hasLocker) {
          lockerCost = (seat.lockerPriceMonthly || 0) * lockerMonths;
        }
        
        if (seat.type === 'PREMIUM' && seat.premiumPriceMonthly) {
          const premiumMultiplier = plan.validityDays / 30;
          premiumSurcharge = seat.premiumPriceMonthly * premiumMultiplier;
          
          if (seat.syncPremiumOffers !== false && plan.discount) {
            premiumSurcharge = premiumSurcharge - (premiumSurcharge * plan.discount / 100);
          }
        }
      }
    } 
    
    if (standaloneLockerId) {
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
        lockerCost = locker.price * lockerMonths;
      }
    }

    const totalAmount = planPrice + lockerCost + premiumSurcharge;

    if (!Number.isFinite(totalAmount) || totalAmount <= 0 || totalAmount > 1_000_000) {
      return NextResponse.json({ error: 'Invalid order amount' }, { status: 400 });
    }

    const appUrl = getAppUrl(req);
    const refId = `ref_${authUserId.substring(0, 8)}_${Date.now()}`;

    const customerInfo: Record<string, string> = {};
    customerInfo.name = authUser.name || "Student";
    if (authUser.phone) customerInfo.contact = authUser.phone.startsWith('+') ? authUser.phone : `+91${authUser.phone}`;
    if (authUser.email) customerInfo.email = authUser.email;

    const callbackUrl = `${appUrl}/api/razorpay/callback`;

    if (callbackUrl.includes('localhost')) {
      console.error('[create-order] FATAL: callback_url is localhost — Razorpay will NOT redirect after payment. Set NEXT_PUBLIC_APP_URL to your production domain.');
      return NextResponse.json({ error: 'Payment system is misconfigured. Please contact support.' }, { status: 500 });
    }

    const razorpay = getRazorpayClient();

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
        studentId: authUserId,
        libraryId,
      },
      expire_by: Math.floor(Date.now() / 1000) + 1800,
    } as any);

    const intent = JSON.stringify({
      studentId: authUserId,
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
