import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { getSession } from "@/app/actions/auth-actions";
import { endOfDayIST } from "@/lib/date-utils";
import { adminAuth } from "@/lib/firebase/firebaseAdmin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let { studentId, libraryId, seatId, planId, hasLocker, standaloneLockerId, idToken } = body;

    let session = await getSession();
    let authUserId = session?.userId;
    let authRole = session?.role;

    if (!session && idToken && adminAuth) {
      try {
        const decoded = await adminAuth.verifyIdToken(idToken);
        const user = await prisma.user.findUnique({ where: { authId: decoded.uid } });
        if (user) {
          authUserId = user.id;
          authRole = user.role;
        }
      } catch (e) {
        console.error("Iframe token verification failed", e);
      }
    }

    if (!authUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!studentId) {
      studentId = authUserId;
    }

    // Validate required fields
    if (!studentId || !libraryId || !planId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (authRole === 'LIBRARIAN') {
      const library = await prisma.library.findUnique({ where: { id: libraryId } });
      if (!library || library.librarianId !== authUserId) {
        return NextResponse.json({ error: 'Forbidden: You do not own this library' }, { status: 403 });
      }
    }

    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan || !plan.isActive) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    // Cross-entity validation: plan must belong to library
    if (plan.libraryId !== libraryId) {
      return NextResponse.json({ error: 'Invalid plan for this library' }, { status: 400 });
    }

    // Cross-entity validation: seat must belong to library
    if (seatId) {
      const seat = await prisma.seat.findUnique({ where: { id: seatId } });
      if (!seat || seat.libraryId !== libraryId) {
        return NextResponse.json({ error: 'Invalid seat for this library' }, { status: 400 });
      }
    }

    // Cross-entity validation: locker must belong to library
    if (standaloneLockerId) {
      const locker = await prisma.standaloneLocker.findUnique({ where: { id: standaloneLockerId } });
      if (!locker || locker.libraryId !== libraryId) {
        return NextResponse.json({ error: 'Invalid locker for this library' }, { status: 400 });
      }
    }

    const isLibrarianOrAdmin = authRole === 'LIBRARIAN' || authRole === 'ADMIN';

    // Atomic transaction to prevent race conditions on seat/locker booking
    const booking = await prisma.$transaction(async (tx) => {
      // Check for an existing active booking (extension logic)
      const activeBooking = await tx.booking.findFirst({
        where: {
          studentId,
          libraryId,
          status: "CONFIRMED",
          endTime: { gt: new Date() }
        },
        orderBy: { endTime: 'desc' }
      });

      const startTime = activeBooking ? new Date(activeBooking.endTime) : new Date();
      const endTime = endOfDayIST(startTime, (plan?.validityDays || 30) - 1);

      // Prevent double booking of seat. For same-student extensions, the
      // current fixed-seat booking ends exactly when the future booking starts,
      // so it is allowed because the intervals do not overlap.
      if (seatId) {
        const existingSeatBooking = await tx.booking.findFirst({
          where: {
            seatId,
            status: { in: ["CONFIRMED"] },
            startTime: { lt: endTime },
            endTime: { gt: startTime }
          }
        });
        if (existingSeatBooking) {
          throw new Error("SEAT_TAKEN");
        }
      }

      // Prevent standalone locker double booking
      if (standaloneLockerId) {
        const existingLockerBooking = await tx.booking.findFirst({
          where: {
            standaloneLockerId,
            status: { in: ["CONFIRMED"] },
            endTime: { gt: new Date() }
          }
        });
        if (existingLockerBooking) {
          throw new Error("LOCKER_TAKEN");
        }
      }

      return await tx.booking.create({
        data: {
          studentId,
          libraryId,
          seatId: seatId || null,
          planId,
          startTime,
          endTime,
          hasLocker: hasLocker || false,
          standaloneLockerId: standaloneLockerId || null,
          status: isLibrarianOrAdmin ? "CONFIRMED" : "PENDING_PAYMENT",
          paymentRef: isLibrarianOrAdmin 
            ? `RECEPTION_CASH_${Date.now()}` 
            : `RECEPTION_PENDING_${Date.now()}`
        }
      });
    }, { isolationLevel: 'Serializable' });

    await redis.del(`library:${libraryId}`);

    return NextResponse.json({ success: true, booking });
  } catch (error: any) {
    console.error("Reception Checkout Error:", error);
    
    if (error.message === "SEAT_TAKEN") {
      return NextResponse.json({ success: false, error: 'This seat has just been reserved by someone else.' }, { status: 409 });
    }
    if (error.message === "LOCKER_TAKEN") {
      return NextResponse.json({ success: false, error: 'This locker has just been reserved by someone else.' }, { status: 409 });
    }

    return NextResponse.json({ success: false, error: 'An error occurred' }, { status: 500 });
  }
}
