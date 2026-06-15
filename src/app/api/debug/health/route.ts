import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    // 1. Find duplicate users by phone
    const usersByPhone = await prisma.user.groupBy({
      by: ['phone'],
      _count: { id: true },
      having: { phone: { not: null }, id: { _count: { gt: 1 } } }
    });

    // 2. Find duplicate libraries by name
    const librariesByName = await prisma.library.groupBy({
      by: ['name'],
      _count: { id: true },
      having: { id: { _count: { gt: 1 } } }
    });

    // 3. Find libraries with mismatched librarian roles or orphaned libraries
    const libraries = await prisma.library.findMany({
      include: { librarian: true }
    });
    
    const orphanedLibraries = libraries.filter(lib => !lib.librarian);
    const nonLibrarianOwners = libraries.filter(lib => lib.librarian && lib.librarian.role !== 'LIBRARIAN' && lib.librarian.role !== 'ADMIN');

    return NextResponse.json({
      duplicateUsersByPhone: usersByPhone,
      duplicateLibrariesByName: librariesByName,
      orphanedLibraries: orphanedLibraries.map(l => l.id),
      nonLibrarianOwners: nonLibrarianOwners.map(l => ({ libId: l.id, ownerId: l.librarianId, role: l.librarian?.role }))
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
