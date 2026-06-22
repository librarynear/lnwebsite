import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/app/actions/auth-actions";

export async function GET(request: Request) {
  // Call getSession (which uses cookies()) outside the try-catch block 
  // so Next.js can correctly throw its internal bailout error during static prerendering.
  const session = await getSession();

  try {
    if (!session || (session.role !== 'LIBRARIAN' && session.role !== 'ADMIN' && session.role !== 'RECEPTIONIST')) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const libraryId = searchParams.get("libraryId");
    const seatId = searchParams.get("seatId");

    if (!libraryId || !seatId) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    // Verify the user has access to this library
    if (session.role !== 'ADMIN') {
      const allowedLibraryId = session.role === 'LIBRARIAN' ? session.userId : session.employerLibraryId;
      const library = await prisma.library.findFirst({
        where: { id: libraryId, librarianId: session.role === 'LIBRARIAN' ? session.userId : undefined }
      });
      // Additional check for receptionist could be done here based on employerLibraryId matching libraryId.
      if (!library && libraryId !== allowedLibraryId) {
        return NextResponse.json({ error: "Unauthorized access to this library" }, { status: 403 });
      }
    }

    const now = new Date();
    // Find the active booking for this seat
    const activeBooking = await prisma.booking.findFirst({
      where: {
        libraryId: libraryId,
        seatId: seatId,
        status: { in: ['CONFIRMED', 'COMPLETED'] }, // sometimes completed bookings might still be temporally active
        endTime: { gt: now }
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            phone: true,
            profilePhotoUrl: true
          }
        },
        plan: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        endTime: 'desc'
      }
    });

    if (!activeBooking) {
      return NextResponse.json({ booking: null });
    }

    return NextResponse.json({ booking: activeBooking });

  } catch (error: any) {
    console.error("Error fetching seat details:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
