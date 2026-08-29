import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/firebaseAdmin';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await adminAuth!.verifyIdToken(token);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { authId: decodedToken.uid },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Mock QR data
    return NextResponse.json({
      qrData: JSON.stringify({
        userId: user.id,
        timestamp: Date.now(),
        type: 'mobile_access'
      }),
      uniqueId: user.uniqueId || `STU${user.id.substring(0, 6).toUpperCase()}`
    });
  } catch (error) {
    console.error("Mobile QR fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
