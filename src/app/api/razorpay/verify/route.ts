import { NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { 
      razorpay_payment_id, 
      razorpay_order_id, 
      razorpay_signature,
      studentId,
      libraryId,
      seatId,
      planId,
      amount,
      hasLocker,
      standaloneLockerId
    } = await req.json();

    const secret = process.env.RAZORPAY_KEY_SECRET!;
    const shasum = crypto.createHmac("sha256", secret);
    shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const expectedSignature = shasum.digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // Determine validity days from plan
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) throw new Error("Plan not found");

    const startTime = new Date();
    const endTime = new Date();
    endTime.setDate(endTime.getDate() + plan.validityDays);

    // Create the booking
    const booking = await prisma.booking.create({
      data: {
        studentId,
        libraryId,
        seatId,
        planId,
        paymentRef: razorpay_payment_id,
        hasLocker: hasLocker || false,
        standaloneLockerId: standaloneLockerId || null,
        startTime,
        endTime,
        status: "CONFIRMED"
      }
    });

    return NextResponse.json({ success: true, booking });
  } catch (error: any) {
    console.error("Razorpay Verify Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
