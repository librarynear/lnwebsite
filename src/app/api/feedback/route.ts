import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/app/actions/auth-actions';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized. Please login to submit feedback.' }, { status: 401 });
    }

    const { targetType, libraryId, studentName, studentPhone, content } = await req.json();

    if (!targetType || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const feedback = await prisma.platformFeedback.create({
      data: {
        targetType,
        libraryId: libraryId || null,
        submitterId: session.userId,
        studentName: studentName || null,
        studentPhone: studentPhone || null,
        content
      }
    });

    return NextResponse.json({ success: true, feedback });
  } catch (error: any) {
    console.error("Platform feedback submission error:", error);
    return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 });
  }
}
