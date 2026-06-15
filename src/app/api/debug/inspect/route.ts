import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const libraries = await prisma.library.findMany({
      include: { librarian: { select: { name: true, phone: true } } },
      orderBy: { name: 'asc' }
    });

    const list = libraries.map(lib => ({
      libraryName: lib.name,
      librarianName: lib.librarian?.name || 'Unknown',
      loginPhoneNumber: lib.librarian?.phone || 'No phone number assigned'
    }));

    return NextResponse.json(list);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
