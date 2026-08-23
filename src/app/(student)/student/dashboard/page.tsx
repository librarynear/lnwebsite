import { Calendar, Clock, MapPin, User as UserIcon, BookOpen, Key, Flame } from "lucide-react";
import { FocusActivityCalendar } from "./FocusActivityCalendar";
import { Suspense } from "react";
import prisma from "@/lib/prisma";
import { getSession } from "@/app/actions/auth-actions";
import { redirect } from "next/navigation";
import Link from "next/link";
import PauseResumeButton from "./PauseResumeButton";
import BookingSuccessToast from "./BookingSuccessToast";
import ExtendPlanModal from "./ExtendPlanModal";
import { AccessQRModal } from "@/components/AccessQRModal";

import { formatStandardDate, formatStandardDateTime } from "@/lib/date-utils";

const formatDate = (date: Date) => formatStandardDate(date);
const formatDateTime = (date: Date) => formatStandardDateTime(date);

export default async function StudentDashboardPage() {
  // Consumer page: any logged-in user can view their own bookings, including
  // librarians/admins browsing the site as a regular user.
  const session = await getSession();
  if (!session) redirect("/login");

  const now = new Date();

  const [student, allBookings, recentLogs] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
    }),
    prisma.booking.findMany({
      where: { studentId: session.userId },
      include: {
        library: true,
        plan: true,
        seat: true,
        standaloneLocker: true
      },
      take: 50,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.checkinLog.findMany({
      where: { 
        studentId: session.userId,
        timestamp: { gte: new Date(new Date().setDate(now.getDate() - 35)) }
      },
      orderBy: { timestamp: 'asc' }
    })
  ]);

  if (!student) redirect("/login");

  const activeBookings = allBookings.filter(b => b.endTime > now && b.status !== 'CANCELLED');
  const pastBookings = allBookings.filter(b => b.endTime <= now || b.status === 'CANCELLED');

  // Calculate Streak
  let currentStreak = 0;
  const uniqueCheckinDates = new Set(
    recentLogs
      .filter(l => l.status === 'CHECK_IN')
      .map(l => new Date(l.timestamp).toISOString().split('T')[0])
  );
  
  const todayStr = now.toISOString().split('T')[0];
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  let checkDate = new Date();
  if (uniqueCheckinDates.has(todayStr)) {
    // start from today
  } else if (uniqueCheckinDates.has(yesterdayStr)) {
    // start from yesterday
    checkDate = yesterday;
  } else {
    checkDate = null as any; // no streak
  }

  if (checkDate) {
    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      if (uniqueCheckinDates.has(dateStr)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
  }

  const calculateTotalAmount = (booking: typeof allBookings[0]) => {
    let displayAmount = 0;
    if (booking.plan) {
      const basePrice = booking.plan.discount ? (booking.plan.price - (booking.plan.price * booking.plan.discount / 100)) : booking.plan.price;
      let lockerCost = 0;
      let premiumCost = 0;
      
      if (booking.seat) {
        if (booking.hasLocker && booking.seat.lockerPriceDaily) {
          lockerCost = booking.seat.lockerPriceDaily * booking.plan.validityDays;
        }
        if (booking.seat.type === 'PREMIUM' && booking.seat.premiumPriceDaily) {
          premiumCost = booking.seat.premiumPriceDaily * booking.plan.validityDays;
          if (booking.seat.syncPremiumOffers !== false && booking.plan.discount) {
            premiumCost -= (premiumCost * booking.plan.discount / 100);
          }
        }
      } else if (booking.standaloneLocker) {
        // Standalone lockers were not migrated to daily, prorate by 28 days
        lockerCost = (booking.standaloneLocker.price / 28) * booking.plan.validityDays;
      }
      displayAmount = Math.round(basePrice + lockerCost + premiumCost);
    }
  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <Suspense fallback={null}><BookingSuccessToast /></Suspense>
      <h1 className="text-4xl font-heading font-bold text-foreground mb-8">My Dashboard</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Pass, Streak, Profile, Calendar */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Digital Pass & Streak Card */}
          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm flex flex-col items-center relative overflow-hidden group cursor-pointer hover:border-primary/50 transition-colors">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
            <AccessQRModal 
              libraryId={activeBookings[0]?.libraryId || ""} 
              studentId={session.userId}
              isCheckedIn={recentLogs.length > 0 && recentLogs[recentLogs.length - 1].status === 'CHECK_IN' && recentLogs[recentLogs.length - 1].libraryId === activeBookings[0]?.libraryId}
            >
              <div className="w-full flex flex-col items-center">
                <div className="w-24 h-24 bg-white rounded-xl p-2 shadow-sm border border-border mb-3 relative overflow-hidden group-hover:shadow-md transition-shadow">
                  {/* Mock QR pattern for the collapsed state */}
                  <div className="w-full h-full bg-[url('https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg')] bg-contain bg-center opacity-80" />
                  <div className="absolute inset-0 bg-black/5 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[1px]">
                    <span className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-1 rounded-full">Tap to Expand</span>
                  </div>
                </div>
                <h3 className="font-heading font-black text-xl text-foreground mb-1 tracking-tight">Digital Pass</h3>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Active Subscription</p>
              </div>
            </AccessQRModal>
            
            <div className="mt-6 flex items-center gap-2 bg-orange-500/10 text-orange-600 dark:text-orange-400 px-4 py-2 rounded-full border border-orange-500/20 shadow-sm relative z-10">
              <Flame className="w-5 h-5 fill-current animate-pulse" />
              <span className="font-bold text-sm">{currentStreak} Day Study Streak</span>
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                <UserIcon className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">{student.name}</h2>
                <p className="text-muted-foreground">Student</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">FocusX ID</p>
                <div className="bg-muted px-4 py-2 rounded-lg font-mono font-bold text-lg tracking-widest text-center text-foreground border border-border/50 select-all">
                  {student.uniqueId}
                </div>
                <p className="text-xs text-center text-muted-foreground mt-2">
                  Show this ID to the librarian for manual check-ins
                </p>
              </div>
              
              <hr className="border-border" />
              
              <div className="space-y-2 text-sm">
                {student.phone && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Phone</span>
                    <span className="font-medium text-foreground">{student.phone}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Focus Activity Calendar */}
          <FocusActivityCalendar logs={recentLogs} />
        </div>

        {/* Bookings Section */}
        <div className="lg:col-span-2 space-y-8">
            <h2 className="text-2xl font-heading font-bold text-foreground mb-4">Active Bookings</h2>
            
            {activeBookings.length === 0 ? (
              <div className="bg-card rounded-2xl border border-dashed border-border p-8 text-center shadow-sm">
                <BookOpen className="w-12 h-12 text-muted-foreground opacity-50 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-foreground">No Active Bookings</h3>
                <p className="text-muted-foreground text-sm mt-1 mb-6">You don&apos;t have any ongoing library subscriptions.</p>
                <Link href="/libraries" className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-bold text-sm hover:opacity-90 transition-opacity inline-flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> Find a Library
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {activeBookings.map((booking) => {
                  const endOfDay = new Date(booking.endTime);
                  endOfDay.setHours(0,0,0,0);
                  const today = new Date();
                  today.setHours(0,0,0,0);
                  const daysLeft = Math.ceil((endOfDay.getTime() - today.getTime()) / (1000 * 3600 * 24)) + 1;

                  return (
                  <div key={booking.id} className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm flex flex-col">
                    {/* Header: Status & Date */}
                    <div className="bg-muted/30 px-6 py-3 border-b border-border flex justify-between items-center">
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded uppercase tracking-wider ${booking.status === 'CONFIRMED' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                        {booking.status}
                      </span>
                      <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" /> Booked: {formatDateTime(booking.createdAt)}
                      </span>
                    </div>

                    {/* Title & Location */}
                    <div className="p-6 pb-4">
                      <Link href={`/library/${booking.libraryId}`} className="text-2xl font-black text-foreground hover:underline inline-block mb-1">
                        {booking.library.name}
                      </Link>
                      <div className="flex items-center gap-1.5 text-foreground/70 text-sm">
                        <MapPin className="w-4 h-4" /> {booking.library.locality}, {booking.library.city}
                      </div>
                    </div>

                    {/* Ticket Body: Details */}
                    <div className="px-6 pb-6">
                      <div className="bg-background rounded-xl border border-border p-5 flex flex-col sm:flex-row justify-between gap-5">
                        <div className="space-y-4">
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1">Plan details</p>
                            <p className="text-base font-bold text-foreground">{booking.plan.name} <span className="text-muted-foreground font-normal mx-1">•</span> <span className="text-primary">₹{calculateTotalAmount(booking)}</span></p>
                          </div>
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2.5 text-foreground/80 text-sm">
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              <span>Valid: <strong className="text-foreground">{formatDate(booking.startTime)}</strong> to <strong className="text-foreground">{formatDate(booking.endTime)}</strong> <span className={`ml-1 text-xs font-bold ${daysLeft <= 3 ? 'text-rose-500' : daysLeft <= 7 ? 'text-amber-500' : 'text-primary'}`}>({daysLeft} days left)</span></span>
                            </div>
                            <div className="flex items-center gap-2.5 text-foreground/80 text-sm">
                              <Clock className="w-4 h-4 text-muted-foreground" />
                              <span>{booking.plan.durationHours ? `${booking.plan.durationHours} hr access/day` : 'Full Day access'}</span>
                            </div>
                            <div className="flex items-center gap-2.5 text-foreground/80 text-sm">
                              <Key className="w-4 h-4 text-muted-foreground" />
                              <span>Access Code: <strong className="text-foreground font-mono bg-muted px-1.5 py-0.5 rounded">{booking.id.split('-')[0].toUpperCase()}</strong></span>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-3 sm:flex-col items-center sm:items-center justify-center sm:justify-center shrink-0 border-t sm:border-t-0 sm:border-l border-border pt-5 sm:pt-0 sm:pl-5 w-full sm:w-[140px]">
                          {/* Seat display removed as per user request */}

                          {booking.hasLocker && (
                            <div className="bg-transparent border border-border px-5 py-3 rounded-xl text-center min-w-[90px]">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-0.5">Locker</p>
                              <p className="text-base font-bold text-foreground">
                                {booking.standaloneLocker ? booking.standaloneLocker.name : "Attached"}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Footer */}
                    <div className="p-4 bg-muted/20 border-t border-border grid grid-cols-2 sm:grid-cols-5 gap-3">
                      <PauseResumeButton bookingId={booking.id} isPaused={booking.isPaused} />
                      <ExtendPlanModal 
                        libraryId={booking.libraryId}
                        planId={booking.planId}
                        seatId={booking.seatId}
                        standaloneLockerId={booking.standaloneLockerId}
                        studentId={session.userId}
                      />
                      <Link
                        href={`/library/${booking.libraryId}?upgrade=${booking.id}`}
                        className="w-full text-primary hover:text-primary/80 text-sm font-medium py-2 rounded-xl transition-colors flex items-center justify-center gap-2 hover:bg-primary/10 border border-primary/20 bg-primary/5"
                        title="Upgrade to a better plan"
                      >
                        Upgrade Plan
                      </Link>
                      {/* AccessQRModal removed from footer, now at the top of the dashboard */}
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Past Bookings */}
          {pastBookings.length > 0 && (
            <div>
              <h2 className="text-2xl font-heading font-bold text-foreground mb-4">Past Bookings</h2>
              
              <div className="space-y-3">
                {pastBookings.map((booking) => (
                  <div key={booking.id} className="bg-card rounded-xl border border-border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 opacity-75 hover:opacity-100 transition-opacity">
                    <div>
                      <h3 className="font-bold text-foreground">{booking.library.name}</h3>
                      <div className="flex items-center gap-4 text-sm mt-1">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" /> Expired {formatDate(booking.endTime)}
                        </span>
                        <span className="text-muted-foreground flex items-center gap-1">
                          {booking.seat ? `Seat ${booking.seat.name}` : "Flexible Plan"} • ₹{calculateTotalAmount(booking)}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0">
                      <ExtendPlanModal 
                        libraryId={booking.libraryId}
                        planId={booking.planId}
                        seatId={booking.seatId}
                        standaloneLockerId={booking.standaloneLockerId}
                        studentId={session.userId}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
