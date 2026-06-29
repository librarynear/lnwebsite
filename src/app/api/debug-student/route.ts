import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  const studentId = '8af987b8-49ef-441a-b2dd-bf137a0dc5b8';
  
  const bookings = await prisma.booking.findMany({
    where: { studentId },
    include: { student: true, plan: true, library: true }
  });
  
  const relays = await prisma.relay.findMany({
    where: { libraryId: bookings[0]?.libraryId }
  });

  return NextResponse.json({
    bookings,
    relays,
    now: new Date().toISOString()
  });
}
