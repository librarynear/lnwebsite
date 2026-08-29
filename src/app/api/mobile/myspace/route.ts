import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/firebaseAdmin';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    await adminAuth!.verifyIdToken(token);

    // Mock active bookings
    return NextResponse.json({ activeBookings: [] });
  } catch (error) {
    console.error("Mobile myspace fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
