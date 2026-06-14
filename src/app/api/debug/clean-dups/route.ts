import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const kripaLibs = await prisma.library.findMany({ where: { name: { contains: 'Kripa' } } });
    
    if (kripaLibs.length > 1) {
      const keep = kripaLibs[0];
      const drop = kripaLibs.slice(1);
      
      for (const lib of drop) {
        // Migrate plans
        await prisma.plan.updateMany({ where: { libraryId: lib.id }, data: { libraryId: keep.id } });
        
        // Migrate seats
        await prisma.seat.updateMany({ where: { libraryId: lib.id }, data: { libraryId: keep.id } });
        
        // Migrate lockers
        await prisma.standaloneLocker.updateMany({ where: { libraryId: lib.id }, data: { libraryId: keep.id } });
        
        // Migrate bookings
        await prisma.booking.updateMany({ where: { libraryId: lib.id }, data: { libraryId: keep.id } });

        // Migrate checkin logs
        await prisma.checkinLog.updateMany({ where: { libraryId: lib.id }, data: { libraryId: keep.id } });

        // Migrate relays
        await prisma.relay.updateMany({ where: { libraryId: lib.id }, data: { libraryId: keep.id } });
        
        // Delete old library
        await prisma.library.delete({ where: { id: lib.id } });
      }
      return NextResponse.json({ success: true, message: `Migrated ${drop.length} duplicate libraries into ${keep.id}` });
    } else {
      return NextResponse.json({ success: true, message: 'No duplicates found' });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
