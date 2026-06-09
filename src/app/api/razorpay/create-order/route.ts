import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(req: Request) {
  try {
    const { amount, receipt } = await req.json();

    const options = {
      amount: Math.round(amount * 100), // amount in paise
      currency: "INR",
      receipt: receipt || `rcpt_${Math.random().toString(36).substring(7)}`,
    };

    const order = await razorpay.orders.create(options);
    return NextResponse.json(order);
  } catch (error: any) {
    console.error("Razorpay error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
