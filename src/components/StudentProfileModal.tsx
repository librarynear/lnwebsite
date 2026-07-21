"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { getStudentProfile } from "@/app/actions/student-actions"
import toast from "react-hot-toast"
import { Loader2, ShieldCheck, CalendarClock, Clock } from "lucide-react"
import type { Prisma } from "@prisma/client"

interface StudentProfileModalProps {
  studentId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Optional callbacks if we want to support action buttons from outside
  onChangeSeat?: (bookingId: string, currentSeatId: string) => void;
  onRenewPlan?: (bookingId: string, planId: string, seatId: string, hasLocker: boolean, standaloneLockerId: string | null) => void;
}

type ProfileStudent = Prisma.UserGetPayload<{
  include: {
    bookings: {
      include: {
        plan: true;
      };
    };
  };
}>;

export function StudentProfileModal({ studentId, open, onOpenChange, onChangeSeat, onRenewPlan }: StudentProfileModalProps) {
  const [profileStudent, setProfileStudent] = useState<ProfileStudent | null>(null);
  const [loading, setLoading] = useState(false);
  const now = new Date();

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      if (!open || !studentId) {
        setProfileStudent(null);
        return;
      }

      setLoading(true);
      const res = await getStudentProfile(studentId);
      if (cancelled) return;

      if (res.success && res.student) {
        setProfileStudent(res.student);
      } else {
        toast.error("Failed to load profile");
        onOpenChange(false);
      }
      setLoading(false);
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, studentId, onOpenChange]);

  function formatStandardDate(isoString: string | Date | undefined | null) {
    if (!isoString) return "N/A";
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(isoString));
  }

  const currentBooking = profileStudent?.bookings?.[0]; // Assuming bookings are ordered by desc

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Student Profile</DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : profileStudent ? (
          <div className="space-y-4 pt-4 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-primary/10 text-primary font-heading font-black text-2xl flex items-center justify-center rounded-full overflow-hidden shrink-0">
                {profileStudent.profilePhotoUrl ? (
                  // User profile photos may use arbitrary external providers.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profileStudent.profilePhotoUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  profileStudent.name?.charAt(0) || "U"
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-foreground">{profileStudent.name}</h3>
                  {profileStudent.digilockerVerified && (
                    <span className="flex items-center gap-1 bg-success/10 text-success text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded">
                      <ShieldCheck className="w-3 h-3" /> Verified
                    </span>
                  )}
                </div>
                <div className="text-sm font-mono text-muted-foreground">{profileStudent.uniqueId}</div>
              </div>
            </div>
            <hr className="border-border" />
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground font-medium block mb-1">Email Address</span>
                <span className="font-bold text-foreground">{profileStudent.email || "N/A"}</span>
              </div>
              <div>
                <span className="text-muted-foreground font-medium block mb-1">Phone Number</span>
                <span className="font-bold text-foreground">{profileStudent.phone || "N/A"}</span>
              </div>
              <div>
                <span className="text-muted-foreground font-medium block mb-1">Date of Birth</span>
                <span className="font-bold text-foreground">{profileStudent.dob ? formatStandardDate(profileStudent.dob) : "N/A"}</span>
              </div>
              <div>
                <span className="text-muted-foreground font-medium block mb-1">Gender</span>
                <span className="font-bold text-foreground capitalize">{profileStudent.gender?.toLowerCase() || "N/A"}</span>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground font-medium block mb-1">Verified Address</span>
                <span className="font-bold text-foreground">{profileStudent.address || "N/A"}</span>
              </div>
            </div>

            <div className="mt-6">
              <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Booking History (This Library)</h4>
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 pb-4">
                {profileStudent.bookings?.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No bookings found in this library.</p>
                ) : (
                  profileStudent.bookings?.map((b) => (
                    <div key={b.id} className="bg-card rounded-2xl border border-border shadow-sm flex flex-col relative overflow-hidden group">
                      <div className={`absolute top-0 w-full h-1 ${b.plan.type === 'FIXED' ? 'bg-primary' : 'bg-warning'}`} />
                      
                      <div className="p-5 flex-1 flex flex-col">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded mb-2 inline-block ${b.plan.type === 'FIXED' ? 'bg-primary/10 text-primary' : 'bg-warning/10 text-warning'}`}>
                              {b.plan.type}
                            </span>
                            <h3 className="text-lg font-bold text-foreground line-clamp-2">{b.plan.name}</h3>
                          </div>
                          <div className="flex justify-between items-start mb-2">
                            {(() => {
                              const isExpired = new Date(b.endTime) < now;
                              if (isExpired) {
                                return (
                                  <span className="text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider bg-destructive/10 text-destructive">
                                    PLAN EXPIRED
                                  </span>
                                );
                              }
                              return (
                                <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider ${b.status === 'CONFIRMED' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                                  {b.status}
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                        
                        <div className="space-y-2 mb-4 mt-auto">
                          <div className="flex items-center text-sm text-foreground">
                            <CalendarClock className="w-4 h-4 text-muted-foreground mr-2" />
                            <span className="font-medium text-muted-foreground mr-1">Booked Dates:</span> 
                            {formatStandardDate(b.startTime)} - {formatStandardDate(b.endTime)}
                          </div>
                          <div className="flex items-center text-sm text-foreground">
                            <Clock className="w-4 h-4 text-muted-foreground mr-2" />
                            <span className="font-medium text-muted-foreground mr-1">Access:</span> {b.plan.durationHours ? `${b.plan.durationHours} Hours / Day` : 'Full Day'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            <DialogFooter className="pt-4 mt-4 border-t border-border flex sm:justify-between items-center w-full gap-2">
              <div className="flex flex-wrap gap-2">
                {onChangeSeat && currentBooking?.status !== 'CANCELLED' && currentBooking?.plan?.type === 'FIXED' && (
                  <Button 
                    onClick={() => {
                      onChangeSeat(currentBooking.id, currentBooking.seatId || "NONE");
                      onOpenChange(false);
                    }}
                    variant="outline"
                    className="bg-muted text-foreground hover:bg-muted/80"
                  >
                    Change Seat
                  </Button>
                )}
                {onRenewPlan && (currentBooking?.status === 'CONFIRMED' || currentBooking?.status === 'COMPLETED') && (
                  <Button 
                      onClick={() => {
                        onOpenChange(false);
                        onRenewPlan(currentBooking.id, currentBooking.planId, currentBooking.seatId || "NONE", currentBooking.hasLocker, currentBooking.standaloneLockerId);
                      }}
                      className="flex-1 bg-primary text-primary-foreground hover:opacity-90"
                  >
                    Renew Plan
                  </Button>
                )}
              </div>
              <Button onClick={() => onOpenChange(false)} variant="default">Close</Button>
            </DialogFooter>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
