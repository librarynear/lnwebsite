import { NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { computeExpectedAmountPaise, amountMatches } from "@/lib/booking-pricing";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    // MANDATORY: Verify webhook signature
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret || !signature) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    // Timing-safe comparison to prevent timing attacks. Compare byte lengths
    // first — timingSafeEqual throws on mismatched lengths, which would surface
    // as a 500 and leak that the length was wrong.
    const expectedBuf = Buffer.from(expectedSignature, 'hex');
    const providedBuf = Buffer.from(signature, 'hex');
    if (expectedBuf.length !== providedBuf.length || !crypto.timingSafeEqual(expectedBuf, providedBuf)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(rawBody);

    if (event.event === "account.instantiated" || event.event === "account.funds_cleared" || event.event === "account.activated") {
      const accountId = event.payload.account.entity.id;
      if (accountId) {
        const libraries = await prisma.library.findMany({ where: { paymentAccountId: accountId } });
        await prisma.library.updateMany({
          where: { paymentAccountId: accountId },
          data: { kycStatus: "APPROVED" }
        });
        const { redis } = await import("@/lib/redis");
        for (const lib of libraries) {
          await redis.del(`library:${lib.id}`);
        }
      }
    } else if (event.event === "account.rejected") {
      const accountId = event.payload.account.entity.id;
      if (accountId) {
        const libraries = await prisma.library.findMany({ where: { paymentAccountId: accountId } });
        await prisma.library.updateMany({
          where: { paymentAccountId: accountId },
          data: { kycStatus: "REJECTED" }
        });
        const { redis } = await import("@/lib/redis");
        for (const lib of libraries) {
          await redis.del(`library:${lib.id}`);
        }
      }
    } else if (event.event === "payment.captured" || event.event === "order.paid") {
      let orderId = event.event === "order.paid"
        ? event.payload.order.entity.id
        : event.payload.payment.entity.order_id;

      // Amount actually paid, as reported by the (signature-verified) event.
      const paidPaise = event.event === "order.paid"
        ? Number(event.payload.payment?.entity?.amount ?? event.payload.order?.entity?.amount_paid)
        : Number(event.payload.payment.entity.amount);

      if (orderId) {
        let bookingCreated = false;
        try {
          await prisma.$transaction(async (tx) => {
            const existingByOrder = await tx.booking.findFirst({ where: { paymentRef: orderId } });
            if (existingByOrder) {
              bookingCreated = true;
              return;
            }

            const { redis } = await import("@/lib/redis");
            const intentStr = await redis.get(`razorpay:intent:${orderId}`);
            if (!intentStr) return;

            const intent = typeof intentStr === 'string' ? JSON.parse(intentStr) : intentStr;
            const plan = await tx.plan.findUnique({ where: { id: intent.planId } });
            if (!plan) {
              throw new Error("PLAN_NOT_FOUND");
            }

            // Verify the paid amount matches the server-computed price before
            // fulfilling. Without this, a tampered order amount would still get
            // a CONFIRMED booking created here.
            const expectedPaise = await computeExpectedAmountPaise({
              planId: intent.planId,
              libraryId: intent.libraryId,
              seatId: intent.seatId,
              hasLocker: intent.hasLocker,
              standaloneLockerId: intent.standaloneLockerId,
            });
            if (expectedPaise === null || !Number.isFinite(paidPaise) || !amountMatches(paidPaise, expectedPaise)) {
              throw new Error("AMOUNT_MISMATCH");
            }

            const activeBooking = await tx.booking.findFirst({
              where: {
                studentId: intent.studentId,
                libraryId: intent.libraryId,
                status: 'CONFIRMED',
                endTime: { gt: new Date() },
              },
              orderBy: { endTime: 'desc' },
            });

            const startTime = activeBooking ? new Date(activeBooking.endTime) : new Date();
            const endTime = new Date(startTime);
            endTime.setDate(endTime.getDate() + plan.validityDays);

            if (intent.seatId) {
              const seatClash = await tx.booking.findFirst({
                where: {
                  seatId: intent.seatId,
                  status: { in: ['CONFIRMED', 'PENDING_PAYMENT'] },
                  startTime: { lt: endTime },
                  endTime: { gt: startTime },
                },
              });
              if (seatClash) throw new Error("SEAT_ALREADY_BOOKED");
            }

            if (intent.standaloneLockerId) {
              const lockerClash = await tx.booking.findFirst({
                where: {
                  standaloneLockerId: intent.standaloneLockerId,
                  status: { in: ['CONFIRMED', 'PENDING_PAYMENT'] },
                  endTime: { gt: new Date() },
                },
              });
              if (lockerClash) throw new Error("LOCKER_ALREADY_BOOKED");
            }

            await tx.booking.create({
              data: {
                studentId: intent.studentId,
                libraryId: intent.libraryId,
                planId: intent.planId,
                seatId: intent.seatId,
                hasLocker: intent.hasLocker,
                standaloneLockerId: intent.standaloneLockerId,
                startTime,
                endTime,
                status: "CONFIRMED",
                paymentRef: orderId,
              },
            });

            bookingCreated = true;

            await redis.del(`razorpay:intent:${orderId}`);
            if (intent.orderId && intent.orderId !== orderId) {
              await redis.del(`razorpay:intent:${intent.orderId}`);
            }
          }, { isolationLevel: 'Serializable' });
        } catch (err: any) {
          if (err.message === "SEAT_ALREADY_BOOKED" || err.message === "LOCKER_ALREADY_BOOKED" || err.message === "AMOUNT_MISMATCH") {
            try {
              const Razorpay = require('razorpay');
              const rzp = new Razorpay({
                key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
                key_secret: process.env.RAZORPAY_KEY_SECRET!,
              });
              const paymentId = event.event === "order.paid"
                ? event.payload.payment?.entity?.id
                : event.payload.payment.entity.id;
              if (paymentId) {
                await rzp.payments.refund(paymentId, {});
                console.log(`Refunded payment ${paymentId} due to ${err.message === "AMOUNT_MISMATCH" ? 'amount mismatch' : 'conflict'}`);
              }
            } catch (refundErr) {
              console.error("Refund failed:", refundErr);
            }
          } else if (err.message === "PLAN_NOT_FOUND") {
            return NextResponse.json({ error: "Plan not found" }, { status: 500 });
          } else {
            throw err;
          }
        }
      }
    } else if (event.event === "payment.authorized") {
      const paymentId = event.payload.payment.entity.id;
      const orderId = event.payload.payment.entity.order_id;
      const amount = event.payload.payment.entity.amount;
      const currency = event.payload.payment.entity.currency;
      
      try {
        const Razorpay = require('razorpay');
        const rzp = new Razorpay({
          key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
          key_secret: process.env.RAZORPAY_KEY_SECRET!
        });
        await rzp.payments.capture(paymentId, amount, currency);
        console.log(`Webhook auto-captured payment ${paymentId} for order ${orderId}`);
        // Once captured, Razorpay will fire payment.captured which will create the booking
      } catch (err) {
        console.error(`Failed to auto-capture payment ${paymentId}:`, err);
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
