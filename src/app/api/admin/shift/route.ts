import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const targets = [
    { name: 'Kripa', phone: '+917838004416' },
    { name: 'Shanti', phone: '+919873591122' },
    { name: 'Gyan Vatika', phone: '+917210042731' }
  ];

  const results = [];

  for (const t of targets) {
    const libs = await prisma.library.findMany({
      where: { name: { contains: t.name, mode: 'insensitive' } },
      include: { librarian: true }
    });

    if (libs.length > 0) {
      const ownerId = libs[0].librarianId;
      if (ownerId) {
        // Clear old
        await prisma.user.updateMany({
           where: { phone: t.phone },
           data: { phone: t.phone + '_old' }
        });

        await prisma.user.update({
          where: { id: ownerId },
          data: { phone: t.phone, role: 'LIBRARIAN' }
        });
        results.push(`Updated librarian for ${libs[0].name} to phone ${t.phone}`);
      }
    } else {
      results.push(`Could not find library for ${t.name}`);
    }
  }

  return NextResponse.json({ success: true, results });
}
