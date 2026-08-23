import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    // Only allow cron requests in production (Vercel sets this header)
    const authHeader = request.headers.get('authorization');
    if (
      process.env.NODE_ENV === 'production' &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // 1 Day before expiry
    const oneDayFromNowStart = new Date(today);
    oneDayFromNowStart.setDate(oneDayFromNowStart.getDate() + 1);
    const oneDayFromNowEnd = new Date(oneDayFromNowStart);
    oneDayFromNowEnd.setDate(oneDayFromNowEnd.getDate() + 1);

    // 3 Days before expiry
    const threeDaysFromNowStart = new Date(today);
    threeDaysFromNowStart.setDate(threeDaysFromNowStart.getDate() + 3);
    const threeDaysFromNowEnd = new Date(threeDaysFromNowStart);
    threeDaysFromNowEnd.setDate(threeDaysFromNowEnd.getDate() + 1);

    // Fetch active bookings expiring tomorrow
    const expiringTomorrow = await prisma.booking.findMany({
      where: {
        status: { in: ['CONFIRMED', 'COMPLETED'] },
        endTime: {
          gte: oneDayFromNowStart,
          lt: oneDayFromNowEnd
        },
        isPaused: false
      },
      include: { plan: true }
    });

    // Fetch active bookings expiring in 3 days
    const expiringIn3Days = await prisma.booking.findMany({
      where: {
        status: { in: ['CONFIRMED', 'COMPLETED'] },
        endTime: {
          gte: threeDaysFromNowStart,
          lt: threeDaysFromNowEnd
        },
        isPaused: false
      },
      include: { plan: true }
    });

    let notificationsCreated = 0;

    // Process tomorrow
    for (const booking of expiringTomorrow) {
      // Check if we already notified
      const existing = await prisma.notification.findFirst({
        where: {
          studentId: booking.studentId,
          title: "Plan Expiring Tomorrow! ⏰",
          createdAt: { gte: today }
        }
      });
      if (!existing) {
        await prisma.notification.create({
          data: {
            studentId: booking.studentId,
            title: "Plan Expiring Tomorrow! ⏰",
            message: `Your ${booking.plan.name} plan expires tomorrow. [Renew Plan](/student/dashboard) to keep your seat!`,
          }
        });
        notificationsCreated++;
      }
    }

    // Process 3 days
    for (const booking of expiringIn3Days) {
      const existing = await prisma.notification.findFirst({
        where: {
          studentId: booking.studentId,
          title: "Plan Expiring Soon 🗓️",
          createdAt: { gte: today }
        }
      });
      if (!existing) {
        await prisma.notification.create({
          data: {
            studentId: booking.studentId,
            title: "Plan Expiring Soon 🗓️",
            message: `Your ${booking.plan.name} plan expires in 3 days. [Renew Plan](/student/dashboard) to avoid losing access.`,
          }
        });
        notificationsCreated++;
      }
    }

    return NextResponse.json({ success: true, notificationsCreated });
  } catch (error) {
    console.error('Expiry notifications cron failed:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
