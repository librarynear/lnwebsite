import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const student = await prisma.user.findFirst({
    where: { role: 'STUDENT' }
  });
  return NextResponse.json(student || {});
}
