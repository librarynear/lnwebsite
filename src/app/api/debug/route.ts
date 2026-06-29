import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("studentId");
  
  if (!studentId) return NextResponse.json({ error: "Missing studentId" }, { status: 400 });

  const bookings = await prisma.booking.findMany({
    where: { studentId },
    include: { student: true, plan: true, library: true }
  });

  const relays = await prisma.relay.findMany();

  return NextResponse.json({
    bookings,
    relays,
    now: new Date().toISOString()
  });
}
