import { NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";

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
    
    // Timing-safe comparison to prevent timing attacks
    if (!crypto.timingSafeEqual(Buffer.from(expectedSignature, 'hex'), Buffer.from(signature, 'hex'))) {
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
      // Async payment capture
      let orderId = event.event === "order.paid" ? event.payload.order.entity.id : event.payload.payment.entity.order_id;
      if (orderId) {
        // Wrap in transaction to avoid race
        await prisma.$transaction(async (tx) => {
          const existing = await tx.booking.findUnique({ where: { paymentRef: orderId } });
          if (!existing) {
            const { redis } = await import("@/lib/redis");
            const intentStr = await redis.get(`razorpay:intent:${orderId}`);
            if (intentStr) {
              const intent = typeof intentStr === 'string' ? JSON.parse(intentStr) : intentStr;
              const plan = await tx.plan.findUnique({ where: { id: intent.planId } });
              if (plan) {
                const now = new Date();
                const endTime = new Date(now.getTime() + plan.validityDays * 24 * 60 * 60 * 1000);
                await tx.booking.create({
                  data: {
                    studentId: intent.studentId,
                    libraryId: intent.libraryId,
                    planId: intent.planId,
                    seatId: intent.seatId,
                    hasLocker: intent.hasLocker,
                    standaloneLockerId: intent.standaloneLockerId,
                    startTime: now,
                    endTime,
                    status: "CONFIRMED",
                    paymentRef: orderId
                  }
                });
              }
            }
          }
        });
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
