'use client'
import { formatStandardDate } from "@/lib/date-utils";

import { useState, useEffect, Fragment } from "react"
import { useRouter } from "next/navigation"
import { Search, UserPlus, UserMinus, MoreVertical, ChevronDown, CheckCircle2, ShieldAlert, ShieldCheck, CalendarClock, Clock, Tag, ArrowUpDown, Filter, X, PlusCircle, MinusCircle, History } from "lucide-react"
import { addStudentWithBooking, approveReceptionPayment, revokeBooking, extendBookingExact, assignUniqueIdToStudent, renewPlan, unrevokeBooking } from "@/app/actions/student-actions"
import { pauseBooking, resumeBooking, updateBookingSeat } from "@/app/actions/booking-actions"
import { generateRFIDCommandQR, addOfflineStudentWithRFID } from "@/app/actions/hardware-actions"
import QRCode from "react-qr-code"
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
  DialogFooter,
  DialogDescription
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"

export function StudentsClient({ bookings, plans, logs = [], relays = [], seats = [] }: { bookings: any[], plans: any[], logs?: any[], relays?: any[], seats?: any[] }) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [revokeBookingId, setRevokeBookingId] = useState<string | null>(null);
  const [revokeReason, setRevokeReason] = useState("");

  const [reasonModalOpen, setReasonModalOpen] = useState(false);
  const [viewReason, setViewReason] = useState("");

  const [paymentApprovalId, setPaymentApprovalId] = useState<string | null>(null)
  const [approvalLoading, setApprovalLoading] = useState(false)
  const [profileStudent, setProfileStudent] = useState<any | null>(null)
  const [addingStudent, setAddingStudent] = useState(false)
  
  const [seatChangeBookingId, setSeatChangeBookingId] = useState<string | null>(null)
  const [selectedNewSeatId, setSelectedNewSeatId] = useState<string | null>(null)

  // Expandable Rows
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Renew Plan Modal
  const [renewModalBookingId, setRenewModalBookingId] = useState<string | null>(null);
  const [renewPlanMode, setRenewPlanMode] = useState<'SAME' | 'CHANGE'>('SAME');
  const [renewSelectedPlanId, setRenewSelectedPlanId] = useState<string | null>(null);
  const [renewSelectedSeatId, setRenewSelectedSeatId] = useState<string | null>(null);
  const [renewLoadingMethod, setRenewLoadingMethod] = useState<'CASH' | 'ONLINE' | null>(null);

  // Tabs & Sorting
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'INACTIVE' | 'REVOKED' | 'EXPIRING'>('ACTIVE')
  const [sortMethod, setSortMethod] = useState<'LATEST' | 'EXPIRY' | 'DURATION' | 'ALPHABETICAL'>('LATEST')
  const [filterPlanId, setFilterPlanId] = useState<string | null>(null)

  // RFID Modal States
  const [rfidModalOpen, setRfidModalOpen] = useState(false);
  const [rfidStudentId, setRfidStudentId] = useState<string | null>(null);
  const [rfidTagInput, setRfidTagInput] = useState("");
  const [rfidQrPayload, setRfidQrPayload] = useState<string | null>(null);
  const [rfidLoading, setRfidLoading] = useState(false);

  // OTP Verification States
  const [step, setStep] = useState<1 | 2>(1)
  const [phone, setPhone] = useState("+91 ")
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const PAGE_SIZE = 20
  const [otp, setOtp] = useState("")
  const [otpLoading, setOtpLoading] = useState(false)
  const [verificationObj, setVerificationObj] = useState<any>(null)
  const [verifiedAuthId, setVerifiedAuthId] = useState<string | null>(null)
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)

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
    if (!isOfflineMode && !verifiedAuthId) {
      toast.error("Please verify the student's phone number first.");
      return;
    }
    if (addingStudent) return;
    const chosenPlan = plans.find(p => p.id === selectedPlanId);
    const chosenSeat = formData.get("seatId");
    if (chosenPlan?.type === 'FIXED' && (!chosenSeat || chosenSeat === "NONE")) {
      toast.error("Please select a seat for this reserved (fixed-seat) plan.");
      return;
    }
    setAddingStudent(true);
    try {
      if (isOfflineMode) {
        const result = await addOfflineStudentWithRFID(formData);
        if (result && result.error) {
          toast.error(result.error);
          return;
        }
        toast.success("Offline student enrolled successfully!");
        setIsOpen(false);
        setPhone("+91 "); setOtp(""); setStep(1); setVerifiedAuthId(null); setSelectedPlanId(null);
        // Show the QR code
        setRfidQrPayload(result.qrPayload!);
        setRfidModalOpen(true);
        router.refresh();
      } else {
        const result = await addStudentWithBooking(formData)
        if (result && 'error' in result) {
          toast.error(result.error);
          return;
        }
        toast.success("Student enrolled successfully");
        setIsOpen(false)
        setPhone("+91 "); setOtp(""); setStep(1); setVerifiedAuthId(null); setSelectedPlanId(null);
        router.refresh();
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to enroll student");
    } finally {
      setAddingStudent(false);
    }
  }

  async function handleSeatChange() {
    if (!seatChangeBookingId) return;
    setLoadingId(seatChangeBookingId);
    try {
      await updateBookingSeat(seatChangeBookingId, selectedNewSeatId === "NONE" ? null : selectedNewSeatId);
      toast.success("Seat updated successfully");
      setSeatChangeBookingId(null);
      router.refresh();
    } catch(e: any) {
      toast.error(e.message || "Failed to update seat");
    } finally {
      setLoadingId(null);
    }
  }

  const now = new Date();
  now.setHours(0,0,0,0);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, search, sortMethod, filterPlanId]);

  const searchedBookings = bookings.filter(b => 
    (b.student.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (b.student.uniqueId && b.student.uniqueId.toLowerCase().includes(search.toLowerCase())) ||
    (b.student.phone && b.student.phone.includes(search))
  );

  const latestBookingsMap = new Map();
  for (const b of searchedBookings) {
    const existing = latestBookingsMap.get(b.studentId);
    if (!existing) {
      latestBookingsMap.set(b.studentId, b);
      continue;
    }
    
    const bIsActiveConf = b.status === 'CONFIRMED' && new Date(b.endTime) >= now;
    const exIsActiveConf = existing.status === 'CONFIRMED' && new Date(existing.endTime) >= now;
    
    if (bIsActiveConf && !exIsActiveConf) {
      latestBookingsMap.set(b.studentId, b);
    } else if (!bIsActiveConf && exIsActiveConf) {
      // keep existing
    } else {
      if (new Date(b.endTime).getTime() > new Date(existing.endTime).getTime()) {
         latestBookingsMap.set(b.studentId, b);
      }
    }
  }
  const uniqueSearchedBookings = Array.from(latestBookingsMap.values());

  const activeBookings = uniqueSearchedBookings.filter((b: any) => {
    const end = new Date(b.endTime);
    end.setHours(0,0,0,0);
    return b.status === 'CONFIRMED' && end >= now;
  });
  const expiringBookings = uniqueSearchedBookings.filter((b: any) => {
    const end = new Date(b.endTime);
    end.setHours(0,0,0,0);
    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    return b.status === 'CONFIRMED' && end >= now && end <= sevenDaysFromNow;
  });
  const inactiveBookings = uniqueSearchedBookings.filter((b: any) => {
    const end = new Date(b.endTime);
    end.setHours(0,0,0,0);
    return b.status !== 'CANCELLED' && end < now;
  });
  const revokedBookings = uniqueSearchedBookings.filter((b: any) => b.status === 'CANCELLED');

  const getFilteredBookings = () => {
    let list = [];
    if (activeTab === 'ACTIVE') list = activeBookings;
    else if (activeTab === 'EXPIRING') list = expiringBookings;
    else if (activeTab === 'INACTIVE') list = inactiveBookings;
    else list = revokedBookings;

    if (filterPlanId) {
      list = list.filter(b => b.planId === filterPlanId);
    }

    return [...list].sort((a, b) => {
      if (sortMethod === 'ALPHABETICAL') return (a.student.name || '').localeCompare(b.student.name || '');
      if (sortMethod === 'LATEST') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortMethod === 'EXPIRY') return new Date(a.endTime).getTime() - new Date(b.endTime).getTime();
      if (sortMethod === 'DURATION') {
        const aDur = new Date(a.endTime).getTime() - new Date(a.startTime).getTime();
        const bDur = new Date(b.endTime).getTime() - new Date(b.startTime).getTime();
        return bDur - aDur;
      }
      return 0;
    });
  }

  const displayedBookings = getFilteredBookings();

  // Renew Plan Math
  const renewBookingData = bookings.find(b => b.id === renewModalBookingId);
  const renewTargetPlan = renewPlanMode === 'SAME' ? renewBookingData?.plan : plans.find(p => p.id === renewSelectedPlanId);
  let renewNewExpiryStr = "";
  let renewAddedDays = 0;
  if (renewBookingData && renewTargetPlan) {
    const end = new Date(renewBookingData.endTime);
    const n = new Date();
    const baseDate = end > n ? end : n;
    renewAddedDays = renewTargetPlan.validityDays;
    const futureEnd = new Date(baseDate);
    futureEnd.setDate(futureEnd.getDate() + renewAddedDays - (end > n ? 0 : 1));
    renewNewExpiryStr = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(futureEnd);
  }

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
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Enroll New Student</DialogTitle>
            </DialogHeader>
            <form action={handleAdd} className="space-y-6 pt-4">
              <input type="hidden" name="authId" value={verifiedAuthId || ''} />
              <div id="recaptcha-container"></div>
              
              <div className="flex gap-4 mb-4 bg-muted/50 p-1.5 rounded-lg w-full max-w-sm mx-auto">
                <button
                  type="button"
                  onClick={() => setIsOfflineMode(false)}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${!isOfflineMode ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Standard (App)
                </button>
                <button
                  type="button"
                  onClick={() => setIsOfflineMode(true)}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${isOfflineMode ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Offline (RFID)
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Legal Name *</Label>
                  <Input id="name" name="name" placeholder="As per ID proof" required />
                </div>
                
                {!isOfflineMode ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address (Optional)</Label>
                      <Input id="email" name="email" type="email" placeholder="john@example.com" />
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
                          readOnly={!!verifiedAuthId || step === 2} 
                          className={!!verifiedAuthId || step === 2 ? "bg-muted cursor-not-allowed opacity-50" : ""}
                          required={!isOfflineMode} 
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
                  </>
                ) : (
                  <div className="space-y-2 md:col-span-1">
                    <Label htmlFor="rfidTag">RFID Tag Hex *</Label>
                    <Input id="rfidTag" name="rfidTag" placeholder="e.g. 1A2B3C4D" required={isOfflineMode} />
                    <p className="text-[10px] text-muted-foreground">Scan an unregistered tag at the door, copy it from Live Logs, and paste it here.</p>
                  </div>
                )}
                
                {!isOfflineMode && (
                  <div className="space-y-2">
                    <Label htmlFor="dob">Date of Birth (Optional)</Label>
                    <Input id="dob" name="dob" type="date" />
                  </div>
                )}
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
                <Label>Assign Initial Plan *</Label>
                <input type="hidden" name="planId" value={selectedPlanId || ""} required />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-64 overflow-y-auto p-1">
                  {plans.map(p => (
                    <div 
                      key={p.id} 
                      onClick={() => setSelectedPlanId(p.id)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedPlanId === p.id ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'border-border hover:border-primary/50'}`}
                    >
                      <div className="font-bold text-foreground text-sm">{p.name}</div>
                      <div className="text-xl font-black mt-1">₹{p.price}</div>
                      <div className="text-xs text-muted-foreground mt-2">{p.validityDays} Days Validity</div>
                    </div>
                  ))}
                </div>
              </div>

              {plans.find(p => p.id === selectedPlanId)?.type === 'FIXED' && (
                <div className="space-y-2">
                  <Label htmlFor="seatId">Assign Seat *</Label>
                  <Select name="seatId">
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a seat" />
                    </SelectTrigger>
                    <SelectContent>
                      {seats.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Reserved plans require a seat.</p>
                </div>
              )}

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
                <Button type="submit" className="w-full" disabled={!verifiedAuthId || addingStudent}>{addingStudent ? "Creating..." : "Create Student & Assign Plan"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col mb-8">
        <div className="p-4 md:p-6 border-b border-border flex flex-col gap-4 bg-muted/20">
          
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
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

            <div className="flex items-center gap-2 self-start md:self-auto">
              <Sheet>
                <SheetTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border h-10 px-4 py-2 gap-2 font-medium bg-background border-border hover:bg-muted text-foreground relative">
                  <Filter className="w-4 h-4" /> Filter & Sort
                  {(filterPlanId || sortMethod !== 'LATEST') && (
                    <span className="w-2 h-2 rounded-full bg-primary absolute top-2 right-2" />
                  )}
                </SheetTrigger>
                <SheetContent className="overflow-y-auto sm:max-w-md p-0">
                  <div className="p-6 border-b border-border bg-muted/20">
                    <SheetHeader>
                      <SheetTitle className="text-xl font-heading font-bold flex items-center gap-2">
                        <Filter className="w-5 h-5 text-primary" /> Filter & Sort Students
                      </SheetTitle>
                    </SheetHeader>
                  </div>
                  
                  <div className="p-6 space-y-8">
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex justify-between items-center">
                        Sort By
                        {sortMethod !== 'LATEST' && (
                          <button onClick={() => setSortMethod('LATEST')} className="text-[10px] text-primary hover:underline lowercase normal-case">Reset</button>
                        )}
                      </h4>
                      <Select value={sortMethod} onValueChange={(val: any) => setSortMethod(val)}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Sort By" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LATEST">Latest Added</SelectItem>
                          <SelectItem value="ALPHABETICAL">Alphabetical (A-Z)</SelectItem>
                          <SelectItem value="EXPIRY">Expiring Soonest</SelectItem>
                          <SelectItem value="DURATION">Plan Duration</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex justify-between items-center">
                        Filter By Plan
                        {filterPlanId && (
                          <button onClick={() => setFilterPlanId(null)} className="text-[10px] text-primary hover:underline lowercase normal-case">Clear Filter</button>
                        )}
                      </h4>
                      <div className="grid grid-cols-1 gap-3">
                        <div 
                          onClick={() => setFilterPlanId(null)}
                          className={`p-3 rounded-lg border cursor-pointer transition-all ${filterPlanId === null ? 'border-primary ring-1 ring-primary/20 bg-primary/5' : 'border-border hover:border-primary/50'}`}
                        >
                          <div className="font-bold text-sm">All Plans</div>
                        </div>
                        {plans.map(p => (
                          <div 
                            key={p.id} 
                            onClick={() => setFilterPlanId(p.id)}
                            className={`p-3 rounded-lg border cursor-pointer transition-all ${filterPlanId === p.id ? 'border-primary ring-1 ring-primary/20 bg-primary/5' : 'border-border hover:border-primary/50'}`}
                          >
                            <div className="font-bold text-foreground text-sm">{p.name}</div>
                            <div className="text-xs text-muted-foreground mt-1">₹{p.price} • {p.validityDays} Days</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          <div className="flex space-x-1 border-b border-border/50 overflow-x-auto">
            <button
              className={`pb-3 px-4 whitespace-nowrap text-sm font-bold border-b-2 transition-colors ${activeTab === 'ACTIVE' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              onClick={() => setActiveTab('ACTIVE')}
            >
              Active ({activeBookings.length})
            </button>
            <button
              className={`pb-3 px-4 whitespace-nowrap text-sm font-bold border-b-2 transition-colors ${activeTab === 'EXPIRING' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              onClick={() => setActiveTab('EXPIRING')}
            >
              Expiring Soon ({expiringBookings.length})
            </button>
            <button
              className={`pb-3 px-4 whitespace-nowrap text-sm font-bold border-b-2 transition-colors ${activeTab === 'INACTIVE' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              onClick={() => setActiveTab('INACTIVE')}
            >
              Inactive/Expired ({inactiveBookings.length})
            </button>
            <button
              className={`pb-3 px-4 whitespace-nowrap text-sm font-bold border-b-2 transition-colors ${activeTab === 'REVOKED' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              onClick={() => setActiveTab('REVOKED')}
            >
              Revoked ({revokedBookings.length})
            </button>
          </div>

        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="p-4 text-xs uppercase tracking-wider font-bold text-muted-foreground w-28">S.No.</th>
                <th className="p-4 text-xs uppercase tracking-wider font-bold text-muted-foreground">ID</th>
                <th className="p-4 text-xs uppercase tracking-wider font-bold text-muted-foreground">Student</th>
                <th className="p-4 text-xs uppercase tracking-wider font-bold text-muted-foreground">Current Plan</th>
                <th className="p-4 text-xs uppercase tracking-wider font-bold text-muted-foreground">Status / Seat</th>
                <th className="p-4 text-xs uppercase tracking-wider font-bold text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {displayedBookings.length > 0 ? (
                displayedBookings.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map((booking, index) => {
                  const endOfDay = new Date(booking.endTime);
                  endOfDay.setHours(0,0,0,0);
                  const today = new Date();
                  today.setHours(0,0,0,0);
                  const daysLeft = Math.ceil((endOfDay.getTime() - today.getTime()) / (1000 * 3600 * 24));
                  const isExpired = endOfDay < today;
                  
                  const isExpanded = expandedRows.has(booking.studentId);
                  const toggleExpand = () => {
                    const newSet = new Set(expandedRows);
                    if (isExpanded) newSet.delete(booking.studentId);
                    else newSet.add(booking.studentId);
                    setExpandedRows(newSet);
                  };
                  
                  let rowClass = `hover:bg-muted/30 transition-colors ${isExpanded ? 'bg-muted/10' : ''}`;
                  let statusBadge = null;

                  if (activeTab === 'ACTIVE') {
                    if (daysLeft <= 3 && daysLeft >= 0) {
                      rowClass += " bg-destructive/5 hover:bg-destructive/10 border-l-4 border-l-destructive";
                    } else if (daysLeft <= 7 && daysLeft > 3) {
                      rowClass += " bg-warning/5 hover:bg-warning/10 border-l-4 border-l-warning";
                    } else {
                      rowClass += " border-l-4 border-l-transparent";
                    }
                  }

                  if (isExpired) {
                    statusBadge = <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-destructive/10 text-destructive">EXPIRED</span>;
                  } else if (booking.status === 'CANCELLED') {
                    statusBadge = (
                      <div className="flex flex-col gap-1 items-start">
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-muted text-muted-foreground">REVOKED</span>
                        {booking.revokedReason && (
                          <span 
                            className="text-[10px] text-muted-foreground max-w-[120px] truncate cursor-pointer hover:underline" 
                            onClick={() => {
                              setViewReason(booking.revokedReason);
                              setReasonModalOpen(true);
                            }}
                          >
                            Reason: {booking.revokedReason}
                          </span>
                        )}
                      </div>
                    );
                  } else if (booking.status === 'CONFIRMED') {
                    if (booking.isPaused) {
                      statusBadge = <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-warning/10 text-warning">PAUSED</span>;
                    } else {
                      statusBadge = <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-success/10 text-success">ACTIVE</span>;
                    }
                  } else {
                    statusBadge = <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-warning/10 text-warning">{booking.status}</span>;
                  }

                  const assignedSeat = seats.find(s => s.id === booking.seatId);

                  return (
                    <Fragment key={booking.id}>
                    <tr className={rowClass}>
                      <td className="p-4 text-sm font-medium text-muted-foreground">
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={toggleExpand} 
                            className="text-muted-foreground hover:text-primary transition-colors focus:outline-none bg-background rounded-full p-0.5 shadow-sm border border-border"
                          >
                            {isExpanded ? <MinusCircle className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
                          </button>
                          {(currentPage - 1) * PAGE_SIZE + index + 1}
                        </div>
                      </td>
                      <td className="p-4">
                        {booking.student.uniqueId ? (
                          <span className="font-mono text-sm font-bold bg-background px-2 py-1 rounded border border-border">{booking.student.uniqueId}</span>
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
                              router.refresh();
                            }}
                          >
                            {loadingId === booking.student.id ? "Generating..." : "Generate ID"}
                          </Button>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-foreground">{booking.student.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{booking.student.phone || booking.student.email}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-foreground">
                          {booking.plan?.name}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-1 flex flex-col gap-0.5">
                          <span>{formatStandardDate(booking.startTime)} - {formatStandardDate(endOfDay)}</span>
                          {activeTab === 'ACTIVE' && !booking.isPaused && (
                            <span className={daysLeft <= 3 ? 'text-destructive font-bold' : daysLeft <= 7 ? 'text-warning font-bold' : ''}>
                              {daysLeft} days remaining
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col items-start gap-2">
                          {statusBadge}
                          {assignedSeat ? (
                            <div className="text-xs bg-primary/10 text-primary px-2 py-1 rounded font-bold">Seat: {assignedSeat.name}</div>
                          ) : (
                            <div className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded font-bold">No Seat Assigned</div>
                          )}
                        </div>
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
                                onClick={() => setProfileStudent({ ...booking.student, booking })}
                                className="cursor-pointer p-2.5 text-sm font-medium rounded-md hover:bg-muted"
                              >
                                View Profile
                              </DropdownMenuItem>

                              {booking.status !== 'CANCELLED' && booking.plan?.type === 'FIXED' && (
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setSeatChangeBookingId(booking.id);
                                    setSelectedNewSeatId(booking.seatId || "NONE");
                                  }}
                                  className="cursor-pointer p-2.5 text-sm font-medium rounded-md hover:bg-muted"
                                >
                                  Change Seat
                                </DropdownMenuItem>
                              )}

                              {booking.status !== 'CANCELLED' && (
                                booking.student.rfidTag ? (
                                  <DropdownMenuItem 
                                    onClick={() => {
                                      setRfidStudentId(booking.student.id);
                                      setRfidTagInput(booking.student.rfidTag || "");
                                      setRfidQrPayload(null);
                                      setRfidModalOpen(true);
                                    }}
                                    className="cursor-pointer p-2.5 text-sm font-medium rounded-md hover:bg-muted"
                                  >
                                    Manage RFID
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem 
                                    onClick={() => {
                                      setRfidStudentId(booking.student.id);
                                      setRfidTagInput("");
                                      setRfidQrPayload(null);
                                      setRfidModalOpen(true);
                                    }}
                                    className="cursor-pointer p-2.5 text-sm font-medium rounded-md hover:bg-muted"
                                  >
                                    Assign RFID
                                  </DropdownMenuItem>
                                )
                              )}
                              
                              {booking.status === 'CONFIRMED' && (
                                booking.isPaused ? (
                                  <DropdownMenuItem 
                                    onClick={async () => {
                                      setLoadingId(booking.id);
                                      try {
                                        const res = await resumeBooking(booking.id);
                                        if (res.extendedDays > 0) {
                                          toast.success(`Plan resumed! Student's plan was extended by ${res.extendedDays} days.`);
                                        } else {
                                          toast.success(`Plan resumed! Pause duration was < 7 days, so plan was not extended.`);
                                        }
                                        router.refresh();
                                      } catch (e: any) {
                                        toast.error(e.message || "Failed to resume");
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
                                      setLoadingId(booking.id);
                                      try {
                                        await pauseBooking(booking.id);
                                        toast.success("Plan paused successfully");
                                        router.refresh();
                                      } catch (e: any) {
                                        toast.error(e.message || "Failed to pause");
                                      }
                                      setLoadingId(null);
                                    }}
                                    className="cursor-pointer p-2.5 text-sm font-medium rounded-md hover:bg-warning/10 text-warning"
                                  >
                                    Pause Plan
                                  </DropdownMenuItem>
                                )
                              )}

                              {(booking.status === 'CONFIRMED' || booking.status === 'COMPLETED') && (
                                <>
                                  <DropdownMenuSeparator className="my-1" />
                                  <DropdownMenuItem 
                                    onClick={() => {
                                      setRenewModalBookingId(booking.id);
                                      setRenewSelectedPlanId(booking.planId);
                                      setRenewSelectedSeatId(booking.seatId || "NONE");
                                      setRenewPlanMode('SAME');
                                    }}
                                    className="cursor-pointer p-2.5 text-sm font-medium rounded-md hover:bg-muted text-foreground"
                                  >
                                    Renew Plan
                                  </DropdownMenuItem>
                                </>
                              )}

                              {booking.status === 'CONFIRMED' && (
                                <>
                                  <DropdownMenuSeparator className="my-1" />
                                  <DropdownMenuItem 
                                    onClick={() => {
                                      setRevokeBookingId(booking.id);
                                      setRevokeReason("");
                                      setRevokeModalOpen(true);
                                    }}
                                    className="cursor-pointer p-2.5 text-sm font-medium rounded-md hover:bg-destructive/10 text-destructive"
                                  >
                                    <UserMinus className="w-4 h-4 mr-2" /> Revoke Access
                                  </DropdownMenuItem>
                                </>
                              )}

                              {booking.status === 'CANCELLED' && (
                                <>
                                  <DropdownMenuSeparator className="my-1" />
                                  <DropdownMenuItem 
                                    onClick={async () => {
                                      setLoadingId(booking.id);
                                      try {
                                        await unrevokeBooking(booking.id);
                                        toast.success("Student un-revoked successfully");
                                        router.refresh();
                                      } catch (e: any) {
                                        toast.error(e.message || "Failed to un-revoke");
                                      }
                                      setLoadingId(null);
                                    }}
                                    className="cursor-pointer p-2.5 text-sm font-medium rounded-md hover:bg-success/10 text-success"
                                  >
                                    Un-revoke Student
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-muted/5 border-b border-border">
                        <td colSpan={6} className="p-0">
                          <div className="px-14 py-4 space-y-3 shadow-inner">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                              <History className="w-3.5 h-3.5" /> Plan History
                            </h4>
                            <div className="grid gap-2">
                              {bookings
                                .filter(b => b.studentId === booking.studentId)
                                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                                .map(hist => {
                                  const hStart = new Date(hist.startTime);
                                  const hEnd = new Date(hist.endTime);
                                  const hIsExpired = hEnd < today;

                                  let displayAmount = 0;
                                  if (hist.plan) {
                                    const basePrice = hist.plan.discount ? (hist.plan.price - (hist.plan.price * hist.plan.discount / 100)) : hist.plan.price;
                                    const lockerMonths = Math.max(1, Math.round(hist.plan.validityDays / 28));
                                    let lockerCost = 0;
                                    if (hist.seatId && hist.hasLocker) {
                                      const seat = seats.find(s => s.id === hist.seatId);
                                      if (seat && seat.lockerPriceMonthly) {
                                        lockerCost = seat.lockerPriceMonthly * lockerMonths;
                                      }
                                    } else if (hist.standaloneLocker) {
                                      lockerCost = hist.standaloneLocker.price * lockerMonths;
                                    }
                                    displayAmount = Math.round(basePrice + lockerCost);
                                  }

                                  return (
                                    <div key={hist.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-background shadow-sm text-sm">
                                      <div>
                                        <div className="font-bold">{hist.plan?.name} <span className="text-xs font-normal text-muted-foreground ml-2">₹{displayAmount}</span></div>
                                        <div className="text-xs text-muted-foreground mt-0.5">
                                          {formatStandardDate(hStart)} - {formatStandardDate(hEnd)}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        {hist.seatId ? <span className="text-xs text-muted-foreground">Seat: {seats.find(s => s.id === hist.seatId)?.name || 'Unknown'}</span> : <span className="text-xs text-muted-foreground">No Seat</span>}
                                        {hist.status === 'CONFIRMED' && !hist.isPaused && !hIsExpired && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-success/10 text-success">ACTIVE</span>}
                                        {hist.status === 'CONFIRMED' && hist.isPaused && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-warning/10 text-warning">PAUSED</span>}
                                        {hist.status === 'CONFIRMED' && hIsExpired && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground">EXPIRED</span>}
                                        {hist.status === 'PENDING_PAYMENT' && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-warning/10 text-warning">PENDING</span>}
                                        {hist.status === 'CANCELLED' && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-destructive/10 text-destructive">REVOKED</span>}
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    No students found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {Math.ceil(displayedBookings.length / PAGE_SIZE) > 1 && (
          <div className="p-4 border-t border-border flex items-center justify-between bg-muted/10">
            <div className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * PAGE_SIZE + 1} to {Math.min(currentPage * PAGE_SIZE, displayedBookings.length)} of {displayedBookings.length}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              >
                Previous
              </Button>
              <div className="flex items-center gap-1 px-2">
                {Array.from({ length: Math.ceil(displayedBookings.length / PAGE_SIZE) }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-8 h-8 rounded-md text-sm font-medium transition-colors ${
                      currentPage === i + 1 
                        ? 'bg-primary text-primary-foreground' 
                        : 'hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === Math.ceil(displayedBookings.length / PAGE_SIZE)}
                onClick={() => setCurrentPage(prev => Math.min(Math.ceil(displayedBookings.length / PAGE_SIZE), prev + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Seat Change Modal */}
      <Dialog open={!!seatChangeBookingId} onOpenChange={(open) => !open && setSeatChangeBookingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Assigned Seat</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <Label>Select New Seat</Label>
            <Select value={selectedNewSeatId && selectedNewSeatId !== "NONE" ? selectedNewSeatId : undefined} onValueChange={setSelectedNewSeatId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a seat" />
              </SelectTrigger>
              <SelectContent>
                {seats.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Reserved (fixed-seat) plans require a seat.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSeatChangeBookingId(null)}>Cancel</Button>
            <Button onClick={handleSeatChange} disabled={loadingId === seatChangeBookingId || !selectedNewSeatId || selectedNewSeatId === "NONE"}>
              {loadingId === seatChangeBookingId ? "Updating..." : "Update Seat"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                if(paymentApprovalId && !approvalLoading) {
                  setApprovalLoading(true);
                  try {
                    await approveReceptionPayment(paymentApprovalId, "CASH");
                    toast.success("Payment approved successfully");
                    setPaymentApprovalId(null);
                    router.refresh();
                  } catch (e: any) {
                    toast.error(e.message || "Failed to approve payment");
                  } finally {
                    setApprovalLoading(false);
                  }
                }
              }} 
              className="w-full bg-primary"
              disabled={approvalLoading}
            >
              {approvalLoading ? "Approving..." : "Paid via Cash"}
            </Button>
            <Button 
              onClick={async () => {
                if(paymentApprovalId && !approvalLoading) {
                  setApprovalLoading(true);
                  try {
                    await approveReceptionPayment(paymentApprovalId, "ONLINE");
                    toast.success("Payment approved successfully");
                    setPaymentApprovalId(null);
                    router.refresh();
                  } catch (e: any) {
                    toast.error(e.message || "Failed to approve payment");
                  } finally {
                    setApprovalLoading(false);
                  }
                }
              }} 
              variant="outline" 
              className="w-full"
              disabled={approvalLoading}
            >
              {approvalLoading ? "Approving..." : "Paid via UPI/Card at Reception"}
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
                            {formatStandardDate(b.startTime)} - {formatStandardDate(b.endTime)}
                          </div>
                          <div className="flex items-center text-sm text-foreground">
                            <Clock className="w-4 h-4 text-muted-foreground mr-2" />
                            <span className="font-medium text-muted-foreground mr-1">Access:</span> {b.plan.durationHours ? `${b.plan.durationHours} Hours / Day` : 'Full Day'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="pt-4 mt-4 border-t border-border flex sm:justify-between items-center w-full gap-2">
            <div className="flex flex-wrap gap-2">
              {profileStudent?.booking?.status !== 'CANCELLED' && profileStudent?.booking?.plan?.type === 'FIXED' && (
                <Button 
                  onClick={() => {
                    setSeatChangeBookingId(profileStudent.booking.id);
                    setSelectedNewSeatId(profileStudent.booking.seatId || "NONE");
                    setProfileStudent(null);
                  }}
                  variant="outline"
                  className="bg-muted text-foreground hover:bg-muted/80"
                >
                  Change Seat
                </Button>
              )}
              {(profileStudent?.booking?.status === 'CONFIRMED' || profileStudent?.booking?.status === 'COMPLETED') && (
                <>
                  <Button 
                    onClick={() => {
                      setRenewModalBookingId(profileStudent.booking.id);
                      setRenewSelectedPlanId(profileStudent.booking.planId);
                      setRenewSelectedSeatId(profileStudent.booking.seatId || "NONE");
                      setRenewPlanMode('SAME');
                      setProfileStudent(null);
                    }}
                    variant="outline"
                  >
                    Renew Plan
                  </Button>
                </>
              )}
            </div>
            <Button onClick={() => setProfileStudent(null)} variant="default">Close</Button>
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
                        <p className="font-medium text-sm text-foreground">{log.student?.name || 'Unknown'}</p>
                        {log.student?.uniqueId && <p className="text-xs font-mono text-muted-foreground">{log.student.uniqueId}</p>}
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

      {/* Revoke Access Dialog */}
      <Dialog open={revokeModalOpen} onOpenChange={setRevokeModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Revoke Student Access</DialogTitle>
            <DialogDescription>
              Are you sure you want to revoke this student's access? Please provide a reason.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="reason" className="font-bold">Reason (Required)</Label>
              <Textarea 
                id="reason"
                placeholder="e.g. Completed exams early, policy violation, etc."
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeModalOpen(false)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={async () => {
                if (!revokeReason || revokeReason.trim() === "") {
                  toast.error("A reason is mandatory to revoke access.");
                  return;
                }
                setLoadingId(revokeBookingId);
                setRevokeModalOpen(false);
                try {
                  await revokeBooking(revokeBookingId!, revokeReason.trim());
                  toast.success("Access revoked");
                  router.refresh();
                } catch (e: any) {
                  toast.error(e.message || "Failed to revoke");
                }
                setLoadingId(null);
              }}
              disabled={!revokeReason || revokeReason.trim() === ""}
            >
              Revoke Access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Reason Dialog */}
      <Dialog open={reasonModalOpen} onOpenChange={setReasonModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Revoked Reason</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-foreground bg-muted p-4 rounded-lg border border-border">
              {viewReason}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReasonModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Renew Plan Dialog */}
      <Dialog open={!!renewModalBookingId} onOpenChange={(open) => {
        if (!open) {
          setRenewModalBookingId(null);
          setRenewLoadingMethod(null);
        }
      }}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Renew Plan</DialogTitle>
          </DialogHeader>

          {renewBookingData && (
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                {renewBookingData.student.name?.[0]?.toUpperCase() || '?'}
              </div>
              <div>
                <div className="font-bold text-foreground text-sm">{renewBookingData.student.name}</div>
                <div className="text-xs text-muted-foreground font-mono">{renewBookingData.student.uniqueId}</div>
              </div>
            </div>
          )}

          <div className="py-2 space-y-4">
            
            {/* Current vs Future State Preview */}
            {renewBookingData && (
              <div className="bg-primary/5 rounded-xl border border-primary/20 p-4 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Currently on:</span>
                  <span className="font-medium text-foreground">{renewBookingData.plan?.name}</span>
                </div>
                <div className="flex justify-between items-center text-sm pb-3 border-b border-primary/10">
                  <span className="text-muted-foreground">Current Expiry:</span>
                  {new Date(renewBookingData.endTime) < new Date() ? (
                    <span className="font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded text-xs">Expired</span>
                  ) : (
                    <span className="font-medium text-foreground">{formatStandardDate(renewBookingData.endTime)}</span>
                  )}
                </div>
                <div className="flex justify-between items-center text-sm pt-1">
                  <span className="font-bold text-primary">Selecting this extends by:</span>
                  <span className="font-bold text-primary">+{renewAddedDays} Days</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="font-bold text-foreground">New Expiry:</span>
                  <span className="font-bold text-success bg-success/10 px-2 py-0.5 rounded">{renewNewExpiryStr}</span>
                </div>
              </div>
            )}

            <div className="flex bg-muted p-1 rounded-lg">
              <button 
                onClick={() => setRenewPlanMode('SAME')}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${renewPlanMode === 'SAME' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Renew Same Plan
              </button>
              <button 
                onClick={() => setRenewPlanMode('CHANGE')}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${renewPlanMode === 'CHANGE' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Choose Another Plan
              </button>
            </div>

            {renewPlanMode === 'CHANGE' && (
              <div className="space-y-2">
                <Label>Select New Plan</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-64 overflow-y-auto p-1">
                  {plans.map(p => (
                    <div 
                      key={p.id} 
                      onClick={() => setRenewSelectedPlanId(p.id)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${renewSelectedPlanId === p.id ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'border-border hover:border-primary/50'}`}
                    >
                      <div className="font-bold text-foreground text-sm">{p.name}</div>
                      <div className="text-xl font-black mt-1">₹{p.price}</div>
                      <div className="text-xs text-muted-foreground mt-2">{p.validityDays} Days Validity</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {renewTargetPlan?.type === 'FIXED' && (
              <div className="space-y-2">
                <Label>Assign Seat *</Label>
                <Select value={renewSelectedSeatId && renewSelectedSeatId !== "NONE" ? renewSelectedSeatId : undefined} onValueChange={(val) => setRenewSelectedSeatId(val)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a seat" />
                  </SelectTrigger>
                  <SelectContent>
                    {seats.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Reserved plans require a seat.</p>
              </div>
            )}
          </div>
          
          <div className="flex flex-col gap-3 pt-2 border-t border-border mt-2">
            <Button 
              onClick={async () => {
                if (!renewModalBookingId) return;
                if (renewTargetPlan?.type === 'FIXED' && (!renewSelectedSeatId || renewSelectedSeatId === "NONE")) {
                  toast.error("Please select a seat for this reserved (fixed-seat) plan.");
                  return;
                }
                setRenewLoadingMethod('CASH');
                try {
                  await renewPlan(
                    renewModalBookingId, 
                    "CASH", 
                    renewPlanMode === 'CHANGE' ? renewSelectedPlanId! : undefined, 
                    renewSelectedSeatId && renewSelectedSeatId !== "NONE" ? renewSelectedSeatId : undefined
                  );
                  toast.success(`Success! ${renewBookingData?.student?.name || 'Student'}'s plan has been extended to ${renewNewExpiryStr}.`);
                  setRenewModalBookingId(null);
                  router.refresh();
                } catch (e: any) {
                  toast.error(e.message || "Failed to renew");
                } finally {
                  setRenewLoadingMethod(null);
                }
              }} 
              className="w-full bg-primary"
              disabled={!!renewLoadingMethod}
            >
              {renewLoadingMethod === 'CASH' ? "Renewing..." : "Pay via Cash"}
            </Button>
            <Button 
              onClick={async () => {
                if (!renewModalBookingId) return;
                if (renewTargetPlan?.type === 'FIXED' && (!renewSelectedSeatId || renewSelectedSeatId === "NONE")) {
                  toast.error("Please select a seat for this reserved (fixed-seat) plan.");
                  return;
                }
                setRenewLoadingMethod('ONLINE');
                try {
                  await renewPlan(
                    renewModalBookingId, 
                    "ONLINE", 
                    renewPlanMode === 'CHANGE' ? renewSelectedPlanId! : undefined, 
                    renewSelectedSeatId && renewSelectedSeatId !== "NONE" ? renewSelectedSeatId : undefined
                  );
                  toast.success(`Success! ${renewBookingData?.student?.name || 'Student'}'s plan has been extended to ${renewNewExpiryStr}.`);
                  setRenewModalBookingId(null);
                  router.refresh();
                } catch (e: any) {
                  toast.error(e.message || "Failed to renew");
                } finally {
                  setRenewLoadingMethod(null);
                }
              }} 
              variant="outline" 
              className="w-full"
              disabled={!!renewLoadingMethod}
            >
              {renewLoadingMethod === 'ONLINE' ? "Renewing..." : "Pay via UPI/Card"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={rfidModalOpen} onOpenChange={setRfidModalOpen}>
        <DialogContent className="max-w-sm sm:max-w-md w-[95vw] rounded-2xl p-6 border border-border bg-background shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{rfidQrPayload ? "Scan this QR" : (rfidTagInput ? "Manage RFID" : "Assign RFID")}</DialogTitle>
          </DialogHeader>

          {rfidQrPayload ? (
            <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl">
              <QRCode value={rfidQrPayload} size={256} />
              <p className="mt-4 text-sm text-center text-muted-foreground">Scan this QR Code at the machine to program the RFID tag offline.</p>
              <Button onClick={() => setRfidModalOpen(false)} className="mt-4 w-full">Done</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label>RFID Tag ID (Hex)</Label>
                <Input 
                  value={rfidTagInput} 
                  onChange={e => setRfidTagInput(e.target.value)} 
                  placeholder="e.g. 1A2B3C4D" 
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button 
                  onClick={async () => {
                    if (!rfidTagInput) { toast.error("Please enter an RFID tag"); return; }
                    setRfidLoading(true);
                    try {
                      // Fetch the student's booking to get their expiry timestamp
                      const booking = bookings.find(b => b.studentId === rfidStudentId);
                      const exp = booking && booking.endTime ? Math.floor(new Date(booking.endTime).getTime() / 1000) : 0;

                      const res = await generateRFIDCommandQR(rfidStudentId!, "ADD_RFID", rfidTagInput, exp);
                      if (res.error) {
                        toast.error(res.error);
                      } else {
                        setRfidQrPayload(res.qrPayload!);
                        toast.success("QR Code Generated");
                      }
                    } catch(e: any) {
                      toast.error("Error generating QR");
                    }
                    setRfidLoading(false);
                  }}
                  disabled={rfidLoading || !rfidTagInput}
                  className="flex-1 bg-primary text-primary-foreground"
                >
                  {rfidLoading ? "Generating..." : "Generate Add QR"}
                </Button>
                
                {rfidTagInput && (
                  <Button 
                    onClick={async () => {
                      setRfidLoading(true);
                      try {
                        const res = await generateRFIDCommandQR(rfidStudentId!, "REVOKE_RFID", rfidTagInput, 0);
                        if (res.error) {
                          toast.error(res.error);
                        } else {
                          setRfidQrPayload(res.qrPayload!);
                          toast.success("QR Code Generated");
                        }
                      } catch(e: any) {
                        toast.error("Error generating QR");
                      }
                      setRfidLoading(false);
                    }}
                    disabled={rfidLoading}
                    variant="destructive"
                    className="flex-1"
                  >
                    Generate Revoke QR
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
