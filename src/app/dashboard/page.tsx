import { Users, BookOpen, Clock, AlertCircle } from "lucide-react";
import Link from "next/link";
import { getSession } from "@/app/actions/auth-actions";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { DashboardCompareChart } from "./DashboardCompareChart";
import { DashboardAttendance } from "./DashboardAttendance";
import { DashboardPendingApprovals } from "./DashboardPendingApprovals";

import { LiveEntryLogs } from "@/components/LiveEntryLogs";

export default async function LibrarianDashboardPage() {
  const session = await getSession();
  if (!session || (session.role !== 'LIBRARIAN' && session.role !== 'ADMIN' && session.role !== 'RECEPTIONIST')) redirect("/");

  const library = await prisma.library.findFirst({ where: session.role === 'ADMIN' ? {} : (session.role === 'RECEPTIONIST' ? { id: session.employerLibraryId as string } : { librarianId: session.userId }) });
  if (!library) redirect("/onboarding");

  // Calculate past 7 days range
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Fetch all necessary data securely
  const [
    studentGroup,
    totalSeatsCount,
    bookedSeats,
    pendingQueries,
    recentBookings,
    checkinLogs,
    allBookings,
    pendingApprovals
  ] = await Promise.all([
    prisma.booking.groupBy({
      by: ['studentId'],
      where: { libraryId: library.id, status: 'CONFIRMED' }
    }),
    prisma.seat.count({ where: { libraryId: library.id } }),
    prisma.booking.count({ 
      where: { 
        libraryId: library.id, 
        status: 'CONFIRMED',
        startTime: { lte: new Date() },
        endTime: { gte: new Date() }
      } 
    }),
    prisma.query.count({ where: { libraryId: library.id } }),
    prisma.booking.findMany({
      where: { libraryId: library.id },
      include: { student: true, plan: true, seat: true },
      orderBy: { createdAt: 'desc' },
      take: 3
    }),
    prisma.checkinLog.findMany({
      where: { libraryId: library.id, timestamp: { gte: sevenDaysAgo } },
      include: { student: { select: { name: true, phone: true } } },
      orderBy: { timestamp: 'desc' }
    }),
    prisma.booking.findMany({
      where: { libraryId: library.id, status: { in: ['CONFIRMED', 'COMPLETED'] } },
      include: { plan: true, standaloneLocker: true, student: true },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.booking.findMany({
      where: { libraryId: library.id, status: 'PENDING_PAYMENT' },
      include: { student: true, plan: true, seat: true },
      orderBy: { createdAt: 'desc' }
    })
  ]);

  const studentCount = studentGroup.length;
  const totalSeats = totalSeatsCount || library.seatsAvailable || 1;
  const occupancyPercentage = Math.round((bookedSeats / totalSeats) * 100);

  const expiringBookings = allBookings.filter(b => {
    const diff = new Date(b.endTime).getTime() - new Date().getTime();
    return diff > 0 && diff < 3 * 24 * 60 * 60 * 1000 && b.status === 'CONFIRMED';
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Dashboard Overview</h1>
          <p className="text-muted-foreground mt-1">Welcome back, {library.name}.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/students" className="bg-primary text-primary-foreground font-semibold px-4 py-2 rounded-lg text-sm hover:opacity-90 transition-opacity">
            + New Booking
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link href="/dashboard/students" className="bg-card p-6 rounded-2xl border border-border shadow-sm block hover:border-primary/50 transition-colors">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-primary/10 rounded-xl text-primary">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Students</p>
              <h3 className="text-2xl font-bold text-foreground">{studentCount}</h3>
            </div>
          </div>
          <div className="text-xs font-medium text-success flex items-center gap-1">
            Real-time count
          </div>
        </Link>

        <Link href="/dashboard/seats" className="bg-card p-6 rounded-2xl border border-border shadow-sm block hover:border-success/50 transition-colors">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-success/10 rounded-xl text-success">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Seat Occupancy</p>
              <h3 className="text-2xl font-bold text-foreground">{occupancyPercentage}%</h3>
            </div>
          </div>
          <div className="text-xs font-medium text-muted-foreground">
            {bookedSeats} of {totalSeats} seats currently booked
          </div>
        </Link>

        <Link href="/dashboard/students" className="bg-card p-6 rounded-2xl border border-border shadow-sm block hover:border-warning/50 transition-colors">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-warning/10 rounded-xl text-warning">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Expiring Soon</p>
              <h3 className="text-2xl font-bold text-foreground">{expiringBookings.length}</h3>
            </div>
          </div>
          <div className="text-xs font-medium text-muted-foreground">
            Plans ending in the next 3 days
          </div>
        </Link>

        <Link href="/dashboard/queries" className="bg-card p-6 rounded-2xl border border-border shadow-sm border-l-4 border-l-destructive block hover:border-destructive/50 transition-colors">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-destructive/10 rounded-xl text-destructive">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pending Queries</p>
              <h3 className="text-2xl font-bold text-foreground">{pendingQueries}</h3>
            </div>
          </div>
          <div className="text-xs font-medium text-destructive">
            Requires immediate attention
          </div>
        </Link>
      </div>

      {/* Row 1: Pending Approvals & Recent Activity */}
      <div className={`grid grid-cols-1 ${pendingApprovals.length > 0 ? 'lg:grid-cols-2' : ''} gap-8`}>
        {pendingApprovals.length > 0 && (
          <DashboardPendingApprovals pendingApprovals={pendingApprovals} />
        )}
        
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm flex flex-col h-full max-h-[500px]">
          <div className="p-6 border-b border-border flex justify-between items-center">
            <h2 className="text-xl font-bold text-foreground">Recent Activity</h2>
            <Link href="/dashboard/students" className="text-primary text-sm font-medium hover:underline">View All</Link>
          </div>
          <div className="p-6 flex-1 overflow-y-auto">
            <div className="space-y-6">
              {recentBookings.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">No recent activity</div>
              ) : (
                recentBookings.map((booking, i) => (
                  <div key={booking.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-primary mt-1.5" />
                      {i !== recentBookings.length - 1 && <div className="w-0.5 h-full bg-border mt-1" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">New student enrolled: <span className="font-bold">{booking.student?.name || 'Unknown'}</span></p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {booking.seat ? `Booked Seat ${booking.seat.name}` : 'No seat assigned'} • {booking.plan?.name || 'Custom Plan'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 font-mono">
                        {booking.createdAt.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Transactions & Check-in Attendance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm flex flex-col h-[420px]">
          <div className="p-6 border-b border-border flex justify-between items-center bg-muted/20">
            <div>
              <h2 className="text-xl font-bold text-foreground">Transactions</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Today's Transactions</p>
            </div>
            <Link href="/dashboard/financials" className="text-primary text-sm font-medium hover:underline">View All</Link>
          </div>
          <div className="p-0 flex-1 overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-muted/50 border-b border-border sticky top-0 backdrop-blur-md">
                <tr>
                  <th className="p-3 text-xs uppercase tracking-wider font-bold text-muted-foreground">Time</th>
                  <th className="p-3 text-xs uppercase tracking-wider font-bold text-muted-foreground">Details</th>
                  <th className="p-3 text-xs uppercase tracking-wider font-bold text-muted-foreground text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(() => {
                  const startOfToday = new Date();
                  startOfToday.setHours(0, 0, 0, 0);
                  const todaysBookings = allBookings.filter(b => new Date(b.createdAt).getTime() >= startOfToday.getTime());

                  if (todaysBookings.length === 0) {
                    return <tr><td colSpan={3} className="p-6 text-center text-sm text-muted-foreground">No transactions today</td></tr>;
                  }

                  return todaysBookings.map((b) => {
                    let price = b.plan?.price || 0;
                    if (b.plan?.discount) price -= (price * b.plan.discount / 100);
                    if (b.standaloneLocker) price += b.standaloneLocker.price;
                    
                    const isRazorpay = b.paymentRef?.startsWith('pay_');
                    const isManual = b.paymentRef?.startsWith('MANUAL_');
                    const isRenewal = b.paymentRef?.startsWith('RENEWAL_');
                    const isReception = b.paymentRef?.startsWith('RECEPTION_');
                    
                    let payMethod = "Cash/Manual";
                    if (isRazorpay) payMethod = "Razorpay";
                    else if (isRenewal) payMethod = b.paymentRef?.includes('ONLINE') ? "Renewal (Online)" : "Renewal (Cash)";
                    else if (isReception) payMethod = b.paymentRef?.includes('ONLINE') ? "Reception (Online)" : "Reception (Cash)";
                    else if (isManual && b.paymentRef?.includes('ONLINE')) payMethod = "Manual (Online)";

                    return (
                      <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 whitespace-nowrap">
                          <div className="text-sm font-bold text-foreground">{b.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </td>
                        <td className="p-3">
                          <div className="text-sm font-bold text-foreground">{b.student?.name || 'Unknown'}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5 flex flex-col gap-0.5">
                            <span className="font-mono text-primary/80">{b.paymentRef || 'No Ref'}</span>
                            <span className="bg-muted px-1.5 py-0.5 rounded w-max mt-0.5">{payMethod}</span>
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <div className="text-sm font-bold text-success">+₹{price.toFixed(0)}</div>
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>

        <div className="h-[420px] flex flex-col gap-6">
          <DashboardAttendance logs={checkinLogs as any} />
          <LiveEntryLogs libraryId={library.id} />
        </div>
      </div>

      {/* Row 3: Admissions Chart */}
      <div className="w-full">
        <DashboardCompareChart allBookings={allBookings} />
      </div>
    </div>
  );
}
