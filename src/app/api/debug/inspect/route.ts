import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const users = await prisma.user.findMany({
      where: { phone: { contains: '7409757395' } }
    });

    const bookings = await prisma.booking.findMany({
      where: { student: { phone: { contains: '7409757395' } } },
      include: { plan: true }
    });

    return NextResponse.json({
      users: users,
      bookings: bookings
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
