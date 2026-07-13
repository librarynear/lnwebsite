import prisma from "@/lib/prisma";
import { StudentsClient } from "./StudentsClient";
import { getSession } from "@/app/actions/auth-actions";
import { redirect } from "next/navigation";

export default async function ManageStudentsPage(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const searchParams = await props.searchParams;
  const page = parseInt(searchParams.page as string || "1", 10);
  const query = (searchParams.query as string || "").trim();
  const tab = (searchParams.tab as string || "ACTIVE").toUpperCase();
  const PAGE_SIZE = 20;

  const session = await getSession();
  if (!session || (session.role !== 'LIBRARIAN' && session.role !== 'ADMIN' && session.role !== 'RECEPTIONIST')) redirect("/");

  const library = await prisma.library.findFirst({ where: session.role === 'ADMIN' ? {} : (session.role === 'RECEPTIONIST' ? { id: session.employerLibraryId as string } : { librarianId: session.userId }) });
  if (!library) redirect("/onboarding");

  const now = new Date();
  now.setHours(0,0,0,0);
  
  const sevenDaysFromNow = new Date(now);
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  // Enterprise Grade: Always fetch LIVE data from the database.
  // Instead of caching, we fetch all bookings for this library in ONE query
  // and do in-memory filtering, which brings the DB queries from 5 down to 1.
  const students = await prisma.user.findMany({
    where: { bookings: { some: { libraryId: library.id } } },
    include: {
      bookings: {
        where: { libraryId: library.id },
        orderBy: { createdAt: 'desc' },
        include: { plan: true, standaloneLocker: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  const parsedBookings = students.flatMap(s => s.bookings.map(b => ({ ...b, student: { ...s, bookings: undefined } })));

  const getTabFilterFn = (tabName: string) => {
    return (b: any) => {
      // Logic mapping to previous Prisma where clauses
      if (tabName === 'ACTIVE') return b.status === 'CONFIRMED' && b.endTime >= now;
      if (tabName === 'EXPIRING') return b.status === 'CONFIRMED' && b.endTime >= now && b.endTime <= sevenDaysFromNow;
      if (tabName === 'INACTIVE') return b.status !== 'CANCELLED' && b.endTime < now;
      if (tabName === 'REVOKED') return b.status === 'CANCELLED';
      return true;
    };
  };

  const getSearchFilterFn = (q: string) => {
    if (!q) return () => true;
    const lowerQ = q.toLowerCase();
    return (b: any) => {
      return (
        b.student.name?.toLowerCase().includes(lowerQ) ||
        b.student.phone?.includes(q) ||
        b.student.uniqueId?.toLowerCase().includes(lowerQ)
      );
    };
  };

  const getFilteredBookingsForTab = (tabName: string) => {
    const tabFilter = getTabFilterFn(tabName);
    const searchFilter = getSearchFilterFn(query);
    
    const matchingBookings = parsedBookings.filter((b: any) => tabFilter(b) && searchFilter(b));
    
    // Group by studentId, taking the first (latest) booking since they are sorted desc
    const seenStudents = new Set();
    const finalBookings = [];
    
    for (const b of matchingBookings) {
      if (!seenStudents.has(b.studentId)) {
        seenStudents.add(b.studentId);
        finalBookings.push(b);
      }
    }
    
    return finalBookings;
  };

  const activeBookings = getFilteredBookingsForTab('ACTIVE');
  const expiringBookings = getFilteredBookingsForTab('EXPIRING');
  const inactiveBookings = getFilteredBookingsForTab('INACTIVE');
  const revokedBookings = getFilteredBookingsForTab('REVOKED');

  const activeCount = activeBookings.length;
  const expiringCount = expiringBookings.length;
  const inactiveCount = inactiveBookings.length;
  const revokedCount = revokedBookings.length;

  let currentTabBookings: any[] = [];
  if (tab === 'ACTIVE') currentTabBookings = activeBookings;
  else if (tab === 'EXPIRING') currentTabBookings = expiringBookings;
  else if (tab === 'INACTIVE') currentTabBookings = inactiveBookings;
  else if (tab === 'REVOKED') currentTabBookings = revokedBookings;
  else currentTabBookings = activeBookings;

  const totalStudentsCount = currentTabBookings.length;
  
  // Paginate in memory
  const bookings = currentTabBookings.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const plans = await prisma.plan.findMany({
    where: { libraryId: library.id, isActive: true }
  });

  const checkinLogsRaw = await prisma.checkinLog.findMany({
    where: { libraryId: library.id },
    include: { student: true, relay: true },
    orderBy: { timestamp: 'desc' },
    take: 50
  });

  const entryLogsRaw = await prisma.entryLog.findMany({
    where: { libraryId: library.id, status: { in: ['SUCCESS', 'DENIED', 'IN', 'OUT'] } },
    include: { user: true },
    orderBy: { timestamp: 'desc' },
    take: 50
  });

  const logs = [
    ...checkinLogsRaw.map(log => ({
      id: log.id,
      studentId: log.studentId,
      libraryId: log.libraryId,
      relayId: log.relayId,
      status: log.status,
      reason: null,
      timestamp: log.timestamp,
      isOfflineSync: log.isOfflineSync,
      createdAt: log.createdAt,
      student: log.student,
      relay: log.relay
    })),
    ...entryLogsRaw.map(log => ({
      id: log.id,
      studentId: log.userId || '',
      libraryId: log.libraryId,
      relayId: log.doorId,
      status: log.status === 'DENIED' ? 'DENIED' : 'CHECK_IN' as any,
      reason: log.reason,
      timestamp: log.timestamp,
      isOfflineSync: false,
      createdAt: log.createdAt,
      student: log.user || { id: '', name: 'Unknown', email: '', phone: '', authId: '', role: 'STUDENT' as const, employerLibraryId: null, isKycVerified: false, kycStatus: 'PENDING', createdAt: log.timestamp, updatedAt: log.timestamp },
      relay: null
    }))
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 50);

  const relays = await prisma.relay.findMany({
    where: { libraryId: library.id }
  });

  const seats = await prisma.seat.findMany({
    where: { libraryId: library.id },
    orderBy: { name: 'asc' }
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <StudentsClient 
        bookings={bookings} 
        plans={plans} 
        logs={logs} 
        relays={relays} 
        seats={seats} 
        totalCount={totalStudentsCount} 
        tabCounts={{ active: activeCount, expiring: expiringCount, inactive: inactiveCount, revoked: revokedCount }}
        currentPage={page} 
        searchQuery={query} 
      />
    </div>
  );
}
