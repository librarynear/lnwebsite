import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { adminAuth } from '@/lib/firebase/firebaseAdmin';

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

    // Return the profile data expected by the mobile app
    return NextResponse.json({
      id: user.id,
      name: user.name || '',
      email: user.email,
      profilePhotoUrl: user.profilePhotoUrl,
      role: user.role,
    });
  } catch (error) {
    console.error("Mobile profile fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
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

    const { name } = await req.json();

    // Upsert user safely to guarantee zero data loss. 
    // If the authId exists, it only updates the name.
    // If it doesn't exist, it safely creates a new student user.
    const user = await prisma.user.upsert({
      where: { authId: decodedToken.uid },
      update: {
        name: name,
      },
      create: {
        authId: decodedToken.uid,
        name: name,
        phone: decodedToken.phone_number || undefined,
        email: decodedToken.email || undefined,
        role: 'STUDENT',
      },
    });

    return NextResponse.json({
      success: true,
      id: user.id,
      name: user.name,
      role: user.role,
    });
  } catch (error) {
    console.error("Mobile profile create/update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
