import { Users, BookOpen, Clock, TrendingUp, AlertCircle } from "lucide-react";
import Link from "next/link";
import { getSession } from "@/app/actions/auth-actions";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function LibrarianDashboardPage() {
  const session = await getSession();
  if (!session || session.role !== 'LIBRARIAN' && session.role !== 'ADMIN') redirect("/");

  const library = await prisma.library.findFirst({ where: session.role === 'ADMIN' ? {} : { librarianId: session.userId } });
  if (!library) redirect("/onboarding");

  const [
    studentGroup,
    totalSeatsCount,
    bookedSeats,
    pendingQueries,
    recentBookings
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
    })
  ]);

  const studentCount = studentGroup.length;
  const totalSeats = totalSeatsCount || library.seatsAvailable || 1;
  const occupancyPercentage = Math.round((bookedSeats / totalSeats) * 100);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Dashboard Overview</h1>
          <p className="text-muted-foreground mt-1">Welcome back, {library.name}.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/students" className="bg-primary text-primary-foreground font-semibold px-4 py-2 rounded-lg text-sm hover:opacity-90 transition-opacity">
            + New Booking (Manual)
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
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
        </div>

        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
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
        </div>

        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-warning/10 rounded-xl text-warning">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Expiring Soon</p>
              <h3 className="text-2xl font-bold text-foreground">0</h3>
            </div>
          </div>
          <div className="text-xs font-medium text-muted-foreground">
            Plans ending in the next 3 days
          </div>
        </div>

        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm border-l-4 border-l-destructive">
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
        </div>
      </div>

      {/* Recent Activity & Today's Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm flex flex-col">
          <div className="p-6 border-b border-border flex justify-between items-center">
            <h2 className="text-xl font-bold text-foreground">Recent Activity</h2>
            <Link href="/dashboard/students" className="text-primary text-sm font-medium hover:underline">View All</Link>
          </div>
          <div className="p-6 flex-1">
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

        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          <div className="p-6 border-b border-border flex justify-between items-center">
            <h2 className="text-xl font-bold text-foreground">Quick Actions</h2>
          </div>
          <div className="p-6 grid grid-cols-2 gap-4">
            <Link href="/dashboard/students" className="p-4 border border-border rounded-xl text-left hover:border-primary hover:bg-primary/5 transition-colors group block">
              <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">Add Student</h3>
              <p className="text-xs text-muted-foreground mt-1">Manually enroll a walk-in</p>
            </Link>
            <Link href="/dashboard/seats" className="p-4 border border-border rounded-xl text-left hover:border-primary hover:bg-primary/5 transition-colors group block">
              <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">Seat Plan</h3>
              <p className="text-xs text-muted-foreground mt-1">Manage grid layout</p>
            </Link>
            <Link href="/dashboard/plans" className="p-4 border border-border rounded-xl text-left hover:border-primary hover:bg-primary/5 transition-colors group block">
              <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">Plans & Pricing</h3>
              <p className="text-xs text-muted-foreground mt-1">Update library plans</p>
            </Link>
            <Link href="/dashboard/students" className="p-4 border border-border rounded-xl text-left hover:border-primary hover:bg-primary/5 transition-colors group block">
              <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">Check-in / Out</h3>
              <p className="text-xs text-muted-foreground mt-1">Update student status</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
