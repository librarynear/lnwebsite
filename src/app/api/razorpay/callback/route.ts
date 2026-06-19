import { NextResponse, type NextRequest } from 'next/server';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import prisma from '@/lib/prisma';
import { redis } from '@/lib/redis';

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

/**
 * Razorpay Payment Link callback — after a successful payment on Razorpay's
 * hosted page, the browser is redirected here with GET query params:
 *   ?razorpay_payment_id=...&razorpay_payment_link_id=...
 *   &razorpay_payment_link_reference_id=...&razorpay_payment_link_status=...
 *   &razorpay_signature=...
 *
 * We verify the signature, retrieve the booking intent from Redis, create the
 * booking, and redirect to the student dashboard.
 */
export async function GET(req: NextRequest) {
  const appUrl = getAppUrl(req);

  try {
    const url = new URL(req.url);
    const paymentId = url.searchParams.get('razorpay_payment_id');
    const linkId = url.searchParams.get('razorpay_payment_link_id');
    const refId = url.searchParams.get('razorpay_payment_link_reference_id');
    const linkStatus = url.searchParams.get('razorpay_payment_link_status');
    const signature = url.searchParams.get('razorpay_signature');

    console.log('[callback] params:', { paymentId: !!paymentId, linkId: !!linkId, refId, linkStatus, sig: !!signature });

    if (!paymentId || !linkId || !refId || !linkStatus || !signature) {
      console.error('[callback] Missing required params');
      return NextResponse.redirect(`${appUrl}/?payment=error`, { status: 303 });
    }

    // 1. Verify Payment Link signature
    //    Payload: payment_link_id|payment_link_reference_id|payment_link_status|payment_id
    const secret = process.env.RAZORPAY_KEY_SECRET!;
    const payload = `${linkId}|${refId}|${linkStatus}|${paymentId}`;
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'))) {
      return NextResponse.redirect(`${appUrl}/?payment=invalid`, { status: 303 });
    }

    if (linkStatus !== 'paid') {
      return NextResponse.redirect(`${appUrl}/?payment=error`, { status: 303 });
    }

    // 2. Retrieve booking intent from Redis (keyed by our reference_id)
    const intentKey = `razorpay:intent:${refId}`;
    const raw = await redis.get(intentKey);
    if (!raw) {
      return NextResponse.redirect(`${appUrl}/?payment=expired`, { status: 303 });
    }
    const intent = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const { studentId, libraryId, planId, seatId, hasLocker, standaloneLockerId, orderId } = intent as {
      studentId: string;
      libraryId: string;
      planId: string;
      seatId: string | null;
      hasLocker: boolean;
      standaloneLockerId: string | null;
      orderId?: string;
    };

    // 3. Fetch plan + cross-entity validation
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

    // 4. Atomic booking creation inside a serializable transaction
    const paymentRef = `plink_${linkId}_${paymentId}`;

    await prisma.$transaction(async (tx) => {
      // Replay prevention: check if this payment link already created a booking
      const existing = await tx.booking.findFirst({ where: { paymentRef } });
      if (existing) throw new Error('PAYMENT_ALREADY_PROCESSED');

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
          paymentRef,
          hasLocker: hasLocker || false,
          standaloneLockerId: standaloneLockerId || null,
          startTime,
          endTime,
          status: 'CONFIRMED',
        },
      });
    }, { isolationLevel: 'Serializable' });

    // 5. Clean up Redis — delete both refId and orderId intent keys to prevent webhook double-booking
    await redis.del(intentKey);
    if (orderId) {
      await redis.del(`razorpay:intent:${orderId}`);
    }
    await redis.del(`library:${libraryId}`);

    const dashboardUrl = `${appUrl}/student/dashboard?booking=success&library=${libraryId}`;
    return new NextResponse(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payment Successful</title>
          <meta http-equiv="refresh" content="2;url=${dashboardUrl}">
          <script>
            setTimeout(() => {
              try {
                if (window.top !== window.self) {
                  window.top.location.href = "${dashboardUrl}";
                } else {
                  window.location.href = "${dashboardUrl}";
                }
              } catch (e) {
                window.location.href = "${dashboardUrl}";
              }
            }, 500);
          </script>
        </head>
        <body style="font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background-color: #f9fafb; margin: 0;">
          <div style="text-align: center; padding: 2.5rem; background: white; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); max-width: 400px; width: 90%;">
            <svg style="width: 64px; height: 64px; color: #10b981; margin: 0 auto 1.5rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <h1 style="font-size: 1.5rem; font-weight: 700; color: #111827; margin-bottom: 0.5rem; margin-top: 0;">Payment Successful!</h1>
            <p style="color: #6b7280; margin-bottom: 2rem; line-height: 1.5;">Your seat has been reserved. You are being redirected to your bookings page...</p>
            <a href="${dashboardUrl}" target="_top" style="display: inline-block; background-color: #f97316; color: white; padding: 0.875rem 1.5rem; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 1rem; width: 100%; box-sizing: border-box; transition: opacity 0.2s;">Go to My Bookings</a>
          </div>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });
  } catch (error: any) {
    console.error('Razorpay callback error:', error);

    if (error.message === 'PAYMENT_ALREADY_PROCESSED') {
      return NextResponse.redirect(`${appUrl}/student/dashboard?booking=success`, { status: 303 });
    }
    if (error.message === 'SEAT_TAKEN' || error.message === 'LOCKER_TAKEN') {
      try {
        const url = new URL(req.url);
        const pId = url.searchParams.get('razorpay_payment_id');
        if (pId) await razorpay.payments.refund(pId, {});
      } catch (refundErr) {
        console.error('Auto-refund failed:', refundErr);
      }
      const label = error.message === 'SEAT_TAKEN' ? 'seat_taken' : 'locker_taken';
      return NextResponse.redirect(`${appUrl}/?payment=${label}`, { status: 303 });
    }

    return NextResponse.redirect(`${appUrl}/?payment=error`, { status: 303 });
  }
}
