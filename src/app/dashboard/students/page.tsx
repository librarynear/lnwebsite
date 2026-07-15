import prisma from "@/lib/prisma";
import { StudentsClient } from "./StudentsClient";
import { getSession } from "@/app/actions/auth-actions";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";

export default async function ManageStudentsPage(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const searchParams = await props.searchParams;
  const requestedPage = parseInt(searchParams.page as string || "1", 10);
  const page = Number.isFinite(requestedPage) ? Math.max(1, requestedPage) : 1;
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

  const normalizedTab = ["ACTIVE", "EXPIRING", "INACTIVE", "REVOKED"].includes(tab)
    ? tab
    : "ACTIVE";
  const tabPredicate =
    normalizedTab === "EXPIRING"
      ? Prisma.sql`b."status" = 'CONFIRMED' AND b."endTime" >= ${now} AND b."endTime" <= ${sevenDaysFromNow}`
      : normalizedTab === "INACTIVE"
        ? Prisma.sql`b."status" <> 'CANCELLED' AND b."endTime" < ${now}`
        : normalizedTab === "REVOKED"
          ? Prisma.sql`b."status" = 'CANCELLED'`
          : Prisma.sql`b."status" = 'CONFIRMED' AND b."endTime" >= ${now}`;
  const searchPredicate = query
    ? Prisma.sql`AND (
        u."name" ILIKE ${`%${query}%`}
        OR u."phone" ILIKE ${`%${query}%`}
        OR u."uniqueId" ILIKE ${`%${query}%`}
      )`
    : Prisma.empty;

  const [pagedIds, countRows] = await Promise.all([
    prisma.$queryRaw<Array<{ id: string; createdAt: Date }>>(Prisma.sql`
      SELECT candidate."id", candidate."createdAt"
      FROM (
        SELECT DISTINCT ON (b."studentId")
          b."id",
          b."createdAt",
          b."studentId"
        FROM "Booking" b
        INNER JOIN "User" u ON u."id" = b."studentId"
        WHERE b."libraryId" = ${library.id}
          AND ${tabPredicate}
          ${searchPredicate}
        ORDER BY b."studentId", b."createdAt" DESC
      ) candidate
      ORDER BY candidate."createdAt" DESC
      LIMIT ${PAGE_SIZE}
      OFFSET ${(page - 1) * PAGE_SIZE}
    `),
    prisma.$queryRaw<Array<{
      active: number;
      expiring: number;
      inactive: number;
      revoked: number;
    }>>(Prisma.sql`
      SELECT
        COUNT(DISTINCT b."studentId") FILTER (
          WHERE b."status" = 'CONFIRMED' AND b."endTime" >= ${now}
        )::int AS "active",
        COUNT(DISTINCT b."studentId") FILTER (
          WHERE b."status" = 'CONFIRMED'
            AND b."endTime" >= ${now}
            AND b."endTime" <= ${sevenDaysFromNow}
        )::int AS "expiring",
        COUNT(DISTINCT b."studentId") FILTER (
          WHERE b."status" <> 'CANCELLED' AND b."endTime" < ${now}
        )::int AS "inactive",
        COUNT(DISTINCT b."studentId") FILTER (
          WHERE b."status" = 'CANCELLED'
        )::int AS "revoked"
      FROM "Booking" b
      INNER JOIN "User" u ON u."id" = b."studentId"
      WHERE b."libraryId" = ${library.id}
      ${searchPredicate}
    `),
  ]);

  const bookingIds = pagedIds.map(({ id }) => id);
  const unorderedBookings = await prisma.booking.findMany({
    where: { id: { in: bookingIds } },
    include: {
      student: true,
      plan: true,
      seat: true,
      standaloneLocker: true,
    },
  });
  const bookingOrder = new Map(bookingIds.map((id, index) => [id, index]));
  const bookings = unorderedBookings.sort(
    (a, b) => (bookingOrder.get(a.id) ?? 0) - (bookingOrder.get(b.id) ?? 0),
  );

  const counts = countRows[0] ?? {
    active: 0,
    expiring: 0,
    inactive: 0,
    revoked: 0,
  };
  const totalStudentsCount =
    normalizedTab === "EXPIRING"
      ? counts.expiring
      : normalizedTab === "INACTIVE"
        ? counts.inactive
        : normalizedTab === "REVOKED"
          ? counts.revoked
          : counts.active;

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
      status: (log.status === 'DENIED' ? 'DENIED' : 'CHECK_IN') as
        | 'DENIED'
        | 'CHECK_IN',
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
        tabCounts={counts}
        currentPage={page} 
        searchQuery={query} 
      />
    </div>
  );
}
