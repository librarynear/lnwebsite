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
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
