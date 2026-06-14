'use client'

import { useState } from "react"
import { Search, UserPlus, MoreVertical, ChevronDown, CheckCircle2, ShieldAlert, ShieldCheck, CalendarClock, Clock, Tag } from "lucide-react"
import { addStudentWithBooking, approveReceptionPayment, revokeBooking, extendBookingExact, assignUniqueIdToStudent } from "@/app/actions/student-actions"
import { pauseBooking, resumeBooking } from "@/app/actions/booking-actions"
import { initializeApp, getApps } from "firebase/app"
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth"
import { firebaseConfig } from "@/lib/firebase/clientApp"
import toast from "react-hot-toast"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function StudentsClient({ bookings, plans, logs = [], relays = [] }: { bookings: any[], plans: any[], logs?: any[], relays?: any[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const [paymentApprovalId, setPaymentApprovalId] = useState<string | null>(null)
  const [profileStudent, setProfileStudent] = useState<any | null>(null)

  // OTP Verification States
  const [step, setStep] = useState<1 | 2>(1)
  const [phone, setPhone] = useState("")
  const [otp, setOtp] = useState("")
  const [otpLoading, setOtpLoading] = useState(false)
  const [verificationObj, setVerificationObj] = useState<any>(null)
  const [verifiedAuthId, setVerifiedAuthId] = useState<string | null>(null)

  const handleSendOTP = async () => {
    try {
      setOtpLoading(true);
      const secondaryApp = getApps().find(app => app.name === 'Secondary') || initializeApp(firebaseConfig, 'Secondary');
      const secondaryAuth = getAuth(secondaryApp);
      
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
      const appVerifier = new RecaptchaVerifier(secondaryAuth, 'recaptcha-container', { size: 'invisible' });
      const confirmation = await signInWithPhoneNumber(secondaryAuth, formattedPhone, appVerifier);
      
      setVerificationObj(confirmation);
      setStep(2);
      toast.success('OTP sent successfully!');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to send OTP");
    } finally {
      setOtpLoading(false);
    }
  }

  const handleVerifyOTP = async () => {
    try {
      setOtpLoading(true);
      const result = await verificationObj.confirm(otp);
      setVerifiedAuthId(result.user.uid);
      const secondaryAuth = getAuth(getApps().find(app => app.name === 'Secondary')!);
      await secondaryAuth.signOut();
      toast.success("Phone verified!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Invalid OTP");
    } finally {
      setOtpLoading(false);
    }
  }

  async function handleAdd(formData: FormData) {
    if (!verifiedAuthId) {
      toast.error("Please verify the student's phone number first.");
      return;
    }
    await addStudentWithBooking(formData)
    setIsOpen(false)
    // Reset states
    setPhone(""); setOtp(""); setStep(1); setVerifiedAuthId(null);
  }

  const filteredBookingsRaw = bookings.filter(b => 
    b.student.name.toLowerCase().includes(search.toLowerCase()) ||
    (b.student.uniqueId && b.student.uniqueId.toLowerCase().includes(search.toLowerCase())) ||
    (b.student.phone && b.student.phone.includes(search))
  )

  const now = new Date();
  const filteredBookings = [...filteredBookingsRaw].sort((a, b) => {
    const aExpired = new Date(a.endTime) < now;
    const bExpired = new Date(b.endTime) < now;
    if (aExpired && !bExpired) return 1;
    if (!aExpired && bExpired) return -1;
    return new Date(b.endTime).getTime() - new Date(a.endTime).getTime();
  });

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Students</h1>
          <p className="text-muted-foreground mt-1">Manage active, inactive, and new enrollments.</p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger className="bg-primary text-primary-foreground font-semibold px-4 py-2.5 rounded-lg text-sm hover:opacity-90 transition-opacity flex items-center gap-2 shadow-sm cursor-pointer">
            <UserPlus className="w-4 h-4" /> Add Student
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Enroll New Student</DialogTitle>
            </DialogHeader>
            <form action={handleAdd} className="space-y-6 pt-4">
              <input type="hidden" name="authId" value={verifiedAuthId || ''} />
              <div id="recaptcha-container"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Legal Name *</Label>
                  <Input id="name" name="name" placeholder="As per ID proof" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input id="email" name="email" type="email" placeholder="john@example.com" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number (OTP Verified) *</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="phone" 
                      name="phone" 
                      value={phone} 
                      onChange={(e) => setPhone(e.target.value)} 
                      placeholder="+91 98765 43210" 
                      disabled={!!verifiedAuthId || step === 2} 
                      required 
                    />
                    {!verifiedAuthId && step === 1 && (
                      <Button type="button" onClick={handleSendOTP} disabled={otpLoading || phone.length < 10}>
                        {otpLoading ? "Sending..." : "Verify"}
                      </Button>
                    )}
                  </div>
                  {!verifiedAuthId && step === 2 && (
                    <div className="flex gap-2 mt-2">
                      <Input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Enter OTP" maxLength={6} />
                      <Button type="button" onClick={handleVerifyOTP} disabled={otpLoading || otp.length < 6}>
                        {otpLoading ? "Checking..." : "Confirm"}
                      </Button>
                    </div>
                  )}
                  {verifiedAuthId && <div className="text-xs text-green-600 font-bold mt-1">✓ Phone Verified</div>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dob">Date of Birth (Optional)</Label>
                  <Input id="dob" name="dob" type="date" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender (Optional)</Label>
                  <Select name="gender">
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Verified Address (Optional)</Label>
                  <Input id="address" name="address" placeholder="Full residential address" />
                </div>
              </div>

              <hr className="border-border" />

              <div className="space-y-2">
                <Label htmlFor="planId">Assign Initial Plan *</Label>
                <Select name="planId" required>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a plan to start" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name} (₹{p.price})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input id="startDate" name="startDate" type="date" defaultValue={new Date().toISOString().split('T')[0]} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <Select name="paymentMethod" defaultValue="CASH" required>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">Cash</SelectItem>
                      <SelectItem value="ONLINE">Online/UPI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter className="pt-4">
                <Button type="submit" className="w-full" disabled={!verifiedAuthId}>Create Student & Assign Plan</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 md:p-6 border-b border-border flex flex-col md:flex-row gap-4 justify-between items-center bg-muted/20">
          <div className="relative w-full md:w-96">
            <input 
              type="text" 
              placeholder="Search by name, ID, or phone..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-input/50 focus:outline-none focus:ring-2 focus:ring-primary shadow-sm text-foreground"
            />
            <Search className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="p-4 text-xs uppercase tracking-wider font-bold text-muted-foreground">ID</th>
                <th className="p-4 text-xs uppercase tracking-wider font-bold text-muted-foreground">Student</th>
                <th className="p-4 text-xs uppercase tracking-wider font-bold text-muted-foreground">Current Plan</th>
                <th className="p-4 text-xs uppercase tracking-wider font-bold text-muted-foreground">Status</th>
                <th className="p-4 text-xs uppercase tracking-wider font-bold text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredBookings.length > 0 ? (
                filteredBookings.map(booking => (
                  <tr key={booking.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-4">
                      {booking.student.uniqueId ? (
                        <span className="font-mono text-sm font-bold bg-muted px-2 py-1 rounded border border-border/50">{booking.student.uniqueId}</span>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-xs h-7 px-2"
                          disabled={loadingId === booking.student.id}
                          onClick={async () => {
                            setLoadingId(booking.student.id);
                            await assignUniqueIdToStudent(booking.student.id);
                            setLoadingId(null);
                          }}
                        >
                          {loadingId === booking.student.id ? "Generating..." : "Generate ID"}
                        </Button>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-foreground">{booking.student.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{booking.student.email}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-foreground">
                        {booking.plan?.name} • ₹{booking.plan?.price}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {new Date(booking.startTime).toLocaleDateString()} - {new Date(booking.endTime).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {Math.ceil((new Date(booking.endTime).getTime() - new Date().getTime()) / (1000 * 3600 * 24))} days left
                      </div>
                    </td>
                    <td className="p-4">
                      {(() => {
                        const isExpired = new Date(booking.endTime) < now;
                        if (isExpired) {
                          return (
                            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-destructive/10 text-destructive">
                              PLAN EXPIRED
                            </span>
                          );
                        }
                        return (
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${booking.status === 'CONFIRMED' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                            {booking.status}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="p-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger disabled={loadingId === booking.id} className="flex items-center gap-2 px-3 py-2 bg-background border border-border hover:bg-muted rounded-lg transition-colors text-foreground font-medium text-sm focus:outline-none disabled:opacity-50">
                          {loadingId === booking.id ? "Loading..." : "Manage"} <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 p-2">
                          <DropdownMenuGroup>
                            <DropdownMenuLabel className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator className="mb-2" />
                            
                            {booking.status === 'PENDING_PAYMENT' && (
                              <DropdownMenuItem 
                                onClick={() => setPaymentApprovalId(booking.id)}
                                className="cursor-pointer p-2.5 text-sm font-medium rounded-md hover:bg-success/10 text-success"
                              >
                                Approve Payment
                              </DropdownMenuItem>
                            )}
                            
                            <DropdownMenuItem 
                              onClick={() => setProfileStudent(booking.student)}
                              className="cursor-pointer p-2.5 text-sm font-medium rounded-md hover:bg-muted"
                            >
                              View Profile
                            </DropdownMenuItem>
                            
                            {booking.status === 'CONFIRMED' && (
                              booking.isPaused ? (
                                <DropdownMenuItem 
                                  onClick={async () => {
                                    setLoadingId(booking.id);
                                    try {
                                      const res = await resumeBooking(booking.id);
                                      if (res.extendedDays > 0) {
                                        alert(`Plan resumed! Student's plan was extended by ${res.extendedDays} days.`);
                                      } else {
                                        alert(`Plan resumed! Pause duration was < 7 days, so plan was not extended.`);
                                      }
                                    } catch (e: any) {
                                      alert(e.message || "Failed to resume");
                                    }
                                    setLoadingId(null);
                                  }}
                                  className="cursor-pointer p-2.5 text-sm font-medium rounded-md hover:bg-success/10 text-success"
                                >
                                  Resume Plan
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem 
                                  onClick={async () => {
                                    if(confirm("Are you sure you want to pause this plan? It must remain paused for > 7 days to get a validity extension.")) {
                                      setLoadingId(booking.id);
                                      try {
                                        await pauseBooking(booking.id);
                                      } catch (e: any) {
                                        alert(e.message || "Failed to pause");
                                      }
                                      setLoadingId(null);
                                    }
                                  }}
                                  className="cursor-pointer p-2.5 text-sm font-medium rounded-md hover:bg-warning/10 text-warning"
                                >
                                  Pause Plan
                                </DropdownMenuItem>
                              )
                            )}
                          </DropdownMenuGroup>
                          <DropdownMenuSeparator className="my-2" />
                          <DropdownMenuItem 
                            onClick={async () => {
                              if (confirm("Are you sure you want to revoke this student's access? This will cancel their active plan immediately.")) {
                                setLoadingId(booking.id);
                                await revokeBooking(booking.id);
                                setLoadingId(null);
                              }
                            }}
                            className="text-destructive cursor-pointer p-2.5 text-sm font-medium rounded-md hover:bg-destructive/10"
                          >
                            Revoke Access
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    No active students found in Supabase database.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Approve Payment Modal */}
      <Dialog open={!!paymentApprovalId} onOpenChange={(open) => !open && setPaymentApprovalId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Reception Payment</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-sm text-muted-foreground">
            How did the student pay at the reception? This will mark their plan as CONFIRMED and active.
          </div>
          <div className="flex flex-col gap-3">
            <Button 
              onClick={async () => {
                if(paymentApprovalId) {
                  await approveReceptionPayment(paymentApprovalId, "CASH");
                  setPaymentApprovalId(null);
                }
              }} 
              className="w-full bg-primary"
            >
              Paid via Cash
            </Button>
            <Button 
              onClick={async () => {
                if(paymentApprovalId) {
                  await approveReceptionPayment(paymentApprovalId, "ONLINE");
                  setPaymentApprovalId(null);
                }
              }} 
              variant="outline" 
              className="w-full"
            >
              Paid via UPI/Card at Reception
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Profile Modal */}
      <Dialog open={!!profileStudent} onOpenChange={(open) => !open && setProfileStudent(null)}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Student Profile</DialogTitle>
          </DialogHeader>
          {profileStudent && (
            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-primary/10 text-primary font-heading font-black text-2xl flex items-center justify-center rounded-full overflow-hidden shrink-0">
                  {profileStudent.profilePhotoUrl ? (
                    <img src={profileStudent.profilePhotoUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    profileStudent.name.charAt(0)
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
                  <span className="font-bold text-foreground">{profileStudent.email}</span>
                </div>
                <div>
                  <span className="text-muted-foreground font-medium block mb-1">Phone Number</span>
                  <span className="font-bold text-foreground">{profileStudent.phone || "N/A"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground font-medium block mb-1">Date of Birth</span>
                  <span className="font-bold text-foreground">{profileStudent.dob ? new Date(profileStudent.dob).toLocaleDateString() : "N/A"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground font-medium block mb-1">Gender</span>
                  <span className="font-bold text-foreground capitalize">{profileStudent.gender?.toLowerCase() || "N/A"}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground font-medium block mb-1">Verified Address</span>
                  <span className="font-bold text-foreground">{profileStudent.address || "N/A"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground font-medium block mb-1">Locality</span>
                  <span className="font-bold text-foreground">{profileStudent.locality || "N/A"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground font-medium block mb-1">Highest Qualification</span>
                  <span className="font-bold text-foreground">{profileStudent.qualification || "N/A"}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground font-medium block mb-1">Organization / College</span>
                  <span className="font-bold text-foreground">{profileStudent.organization || "N/A"}</span>
                </div>
              </div>

              <div className="mt-6">
                <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Booking History (This Library)</h4>
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 pb-4">
                  {bookings.filter(b => b.student.id === profileStudent.id).map(b => (
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
                            {new Date(b.startTime).toLocaleDateString()} - {new Date(b.endTime).toLocaleDateString()}
                          </div>
                          <div className="flex items-center text-sm text-foreground">
                            <Clock className="w-4 h-4 text-muted-foreground mr-2" />
                            <span className="font-medium text-muted-foreground mr-1">Access:</span> {b.plan.durationHours ? `${b.plan.durationHours} Hours / Day` : 'Full Day'}
                          </div>
                          <div className="flex items-center text-sm text-foreground">
                            <Tag className="w-4 h-4 text-muted-foreground mr-2" />
                            <span className="font-medium text-muted-foreground mr-1">Discounts applied:</span> {b.plan.discount ? `${b.plan.discount}%` : 'None'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="pt-4 mt-4 border-t border-border">
            <Button onClick={() => setProfileStudent(null)} className="w-full" variant="outline">Close Profile</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hardware Status & Live Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        {/* Hardware Status */}
        <div className="bg-card rounded-2xl border border-border shadow-sm p-6 lg:col-span-1 flex flex-col">
          <h2 className="text-xl font-bold text-foreground mb-4">Hardware Relays</h2>
          <div className="space-y-4 flex-1">
            {relays.length === 0 ? (
              <p className="text-sm text-muted-foreground">No relays configured for this library yet.</p>
            ) : (
              relays.map(relay => {
                const isOffline = new Date().getTime() - new Date(relay.lastSync).getTime() > 10 * 60 * 1000; // 10 mins
                return (
                  <div key={relay.id} className="p-4 border border-border rounded-xl flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm text-foreground">Relay {relay.id.substring(0,6)}</p>
                      <p className="text-xs text-muted-foreground mt-1">Tag: <span className="font-mono">{relay.nfcTagId}</span></p>
                      <p className="text-[10px] text-muted-foreground mt-1">Last Sync: {new Date(relay.lastSync).toLocaleTimeString()}</p>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="flex items-center gap-1.5 text-xs font-bold uppercase">
                        <span className={`w-2 h-2 rounded-full ${isOffline ? 'bg-destructive' : 'bg-success'}`} />
                        <span className={isOffline ? 'text-destructive' : 'text-success'}>{isOffline ? 'OFFLINE' : 'ONLINE'}</span>
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Live Logs */}
        <div className="bg-card rounded-2xl border border-border shadow-sm lg:col-span-2 overflow-hidden flex flex-col h-[400px]">
          <div className="p-4 md:p-6 border-b border-border bg-muted/20">
            <h2 className="text-xl font-bold text-foreground">Live Activity Log</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">No recent activity</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-card border-b border-border z-10">
                  <tr>
                    <th className="p-4 text-xs uppercase tracking-wider font-bold text-muted-foreground">Time</th>
                    <th className="p-4 text-xs uppercase tracking-wider font-bold text-muted-foreground">Student</th>
                    <th className="p-4 text-xs uppercase tracking-wider font-bold text-muted-foreground">Event</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {logs.map(log => (
                    <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-4 text-sm text-muted-foreground">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {log.isOfflineSync && <span className="block text-[10px] text-warning mt-0.5">Synced Offline</span>}
                      </td>
                      <td className="p-4">
                        <p className="font-medium text-sm text-foreground">{log.student.name}</p>
                        {log.student.uniqueId && <p className="text-xs font-mono text-muted-foreground">{log.student.uniqueId}</p>}
                      </td>
                      <td className="p-4">
                        <span className={`text-xs font-bold px-2 py-1 rounded uppercase tracking-wider ${
                          log.status === 'CHECK_IN' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                        }`}>
                          {log.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
