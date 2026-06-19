import { Calendar, Clock, MapPin, User as UserIcon, BookOpen, Key } from "lucide-react";
import { Suspense } from "react";
import prisma from "@/lib/prisma";
import { getSession } from "@/app/actions/auth-actions";
import { redirect } from "next/navigation";
import Link from "next/link";
import PauseResumeButton from "./PauseResumeButton";
import BookingSuccessToast from "./BookingSuccessToast";
import LocateSeatModal from "./LocateSeatModal";
import ExtendPlanModal from "./ExtendPlanModal";

const formatDate = (date: Date) => date.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', month: 'short', day: 'numeric', year: 'numeric' });
const formatDateTime = (date: Date) => date.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default async function StudentDashboardPage() {
  // Consumer page: any logged-in user can view their own bookings, including
  // librarians/admins browsing the site as a regular user.
  const session = await getSession();
  if (!session) redirect("/login");

  const now = new Date();

  const [student, allBookings] = await Promise.all([
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
    })
  ]);

  if (!student) redirect("/login");

  const activeBookings = allBookings.filter(b => b.endTime > now);
  const pastBookings = allBookings.filter(b => b.endTime <= now);

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <Suspense><BookingSuccessToast /></Suspense>
      <h1 className="text-4xl font-heading font-bold text-foreground mb-8">My Dashboard</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Profile Card */}
        <div className="lg:col-span-1 space-y-6">
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
                <p className="text-sm text-muted-foreground mb-1">FocusDesk ID</p>
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
        </div>

        {/* Bookings Section */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Active Bookings */}
          <div>
            <h2 className="text-2xl font-heading font-bold text-foreground mb-4">Active Bookings</h2>
            
            {activeBookings.length === 0 ? (
              <div className="bg-card rounded-2xl border border-dashed border-border p-8 text-center shadow-sm">
                <BookOpen className="w-12 h-12 text-muted-foreground opacity-50 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-foreground">No Active Bookings</h3>
                <p className="text-muted-foreground text-sm mt-1 mb-6">You don't have any ongoing library subscriptions.</p>
                <Link href="/libraries" className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-bold text-sm hover:opacity-90 transition-opacity inline-flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> Find a Library
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {activeBookings.map((booking) => (
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
                            <p className="text-base font-bold text-foreground">{booking.plan.name} <span className="text-muted-foreground font-normal mx-1">•</span> <span className="text-primary">₹{booking.plan.price}</span></p>
                          </div>
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2.5 text-foreground/80 text-sm">
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              <span>Valid: <strong className="text-foreground">{formatDate(booking.startTime)}</strong> to <strong className="text-foreground">{formatDate(booking.endTime)}</strong></span>
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
                          {booking.seat ? (
                            <div className="bg-transparent border border-border px-5 py-3 rounded-xl text-center min-w-[90px]">
                              <p className="text-[10px] text-primary uppercase tracking-widest font-bold mb-0.5">Seat</p>
                              <p className="text-2xl font-black text-primary">{booking.seat.name}</p>
                            </div>
                          ) : (
                            <div className="bg-transparent border border-border px-5 py-3 rounded-xl text-center min-w-[90px]">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-0.5">Seat</p>
                              <p className="text-sm font-bold text-foreground mt-1">FLEXIBLE</p>
                            </div>
                          )}

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
                    <div className="p-4 bg-muted/20 border-t border-border grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <PauseResumeButton bookingId={booking.id} isPaused={booking.isPaused} pausedAt={booking.pausedAt} />
                      <ExtendPlanModal 
                        booking={booking} 
                        studentId={session.userId} 
                        studentEmail={student.email} 
                        studentPhone={student.phone} 
                      />
                      <LocateSeatModal 
                        libraryId={booking.libraryId} 
                        targetSeatId={booking.seatId} 
                        isFlexible={booking.plan.type === "FLEXIBLE"} 
                      />
                    </div>
                  </div>
                ))}
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
                          {booking.seat ? `Seat ${booking.seat.name}` : "Flexible Plan"} • ₹{booking.plan.price}
                        </span>
                      </div>
                    </div>
                    <Link href={`/library/${booking.libraryId}`} className="text-sm font-medium text-primary hover:underline self-start sm:self-center shrink-0">
                      Book Again
                    </Link>
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
