"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Command } from "cmdk"
import { Search, UserPlus, Users, Banknote, ListChecks, Settings, MessageSquare, Briefcase, Plus, Armchair, HelpCircle, Loader2, ArrowRight, User, Calendar, XCircle, CheckCircle2 } from "lucide-react"
import { renewPlan, revokeBooking, updateBookingStartDate, getLibraryPlansForCmdk, getAllStudentsLightweight } from "@/app/actions/student-actions"
import toast from "react-hot-toast"
import { PlanCard } from "./PlanCard"
import Fuse from "fuse.js"
import * as chrono from "chrono-node"

// ── Fuzzy Heuristic Engine helpers ──

const ACTION_ALIASES: Record<string, string> = {
  renew: 'RENEW', rnw: 'RENEW', rn: 'RENEW', renewal: 'RENEW',
  revoke: 'REVOKE', rvk: 'REVOKE', cancel: 'REVOKE', remove: 'REVOKE',
  date: 'CHANGE_DATE', changedate: 'CHANGE_DATE', startdate: 'CHANGE_DATE',
}

function detectAction(tokens: string[]): { action: string | null; rest: string[] } {
  if (tokens.length === 0) return { action: null, rest: tokens }
  const first = tokens[0].toLowerCase().replace(/[^a-z]/g, '')
  const action = ACTION_ALIASES[first] || null
  return { action, rest: action ? tokens.slice(1) : tokens }
}

function matchPlan(query: string, plans: any[]): any | null {
  const q = query.toLowerCase().replace(/hr/g, ' hr').replace(/mo/g, ' month').replace(/  +/g, ' ')
  let best: any = null
  let bestScore = 0

  for (const plan of plans) {
    let score = 0
    if (q.includes(plan.name.toLowerCase())) score += 10
    const months = Math.max(1, Math.round(plan.validityDays / 30))
    if (q.includes(`${months} month`)) score += 5
    if (plan.durationHours && (q.includes(`${plan.durationHours} hr`) || q.includes(`${plan.durationHours} hour`))) score += 5
    if (!plan.durationHours && (q.includes('full') || q.includes('24'))) score += 5
    if (q.includes('same plan') || q.includes('same')) score += 0 // handled separately
    if (score > bestScore) { bestScore = score; best = plan }
  }
  return bestScore >= 5 ? best : null
}

function detectPayment(query: string): string | null {
  const q = query.toLowerCase()
  if (q.includes('cash')) return 'CASH'
  if (q.includes('online') || q.includes('upi') || q.includes('gpay')) return 'ONLINE'
  return null
}

function detectDate(query: string): Date | null {
  const results = chrono.parse(query, new Date(), { forwardDate: true })
  return results.length > 0 ? results[0].start.date() : null
}

export function CommandMenu() {
  const [open, setOpen] = React.useState(false)
  const router = useRouter()
  
  const [pages, setPages] = React.useState<string[]>(['home'])
  const activePage = pages[pages.length - 1]

  const [parsedCommand, setParsedCommand] = React.useState<any>(null)
  
  const [searchQuery, setSearchQuery] = React.useState("")
  const [students, setStudents] = React.useState<any[]>([])
  const [isSearching, setIsSearching] = React.useState(false)
  const [selectedStudent, setSelectedStudent] = React.useState<any>(null)
  
  const [plans, setPlans] = React.useState<any[]>([])
  const [selectedPlan, setSelectedPlan] = React.useState<any>(null)
  const [newStartDate, setNewStartDate] = React.useState<string>("")
  const [isExecuting, setIsExecuting] = React.useState(false)

  // ── Local data store ──
  const [allStudents, setAllStudents] = React.useState<any[]>([])
  const [dataLoaded, setDataLoaded] = React.useState(false)
  const fuseRef = React.useRef<Fuse<any> | null>(null)

  // Fetch all students + plans once when menu opens
  React.useEffect(() => {
    if (open && !dataLoaded) {
      Promise.all([
        getAllStudentsLightweight(),
        getLibraryPlansForCmdk()
      ]).then(([studentsRes, plansRes]) => {
        const s = studentsRes.students || []
        setAllStudents(s)
        if (plansRes.plans) setPlans(plansRes.plans)
        fuseRef.current = new Fuse(s, {
          keys: [
            { name: 'name', weight: 0.6 },
            { name: 'phone', weight: 0.25 },
            { name: 'uniqueId', weight: 0.15 },
          ],
          threshold: 0.35,
          distance: 100,
          includeScore: true,
        })
        setDataLoaded(true)
      })
    }
  }, [open, dataLoaded])

  // ── Instant local parsing on every keystroke ──
  React.useEffect(() => {
    if (activePage !== 'home' || searchQuery.length < 2 || !fuseRef.current) {
      if (searchQuery.length < 2) { setStudents([]); setParsedCommand(null) }
      return
    }

    const q = searchQuery.trim()
    const tokens = q.split(/\s+/)
    const { action, rest } = detectAction(tokens)
    const restStr = rest.join(' ')

    if (action && restStr.length >= 2) {
      // Extract the name part: the first token(s) that aren't plan/payment/date keywords
      const namePart = rest[0] || ''
      const fuseResults = fuseRef.current.search(namePart)
      const matchedStudent = fuseResults.length > 0 ? fuseResults[0].item : null

      if (!matchedStudent) {
        setParsedCommand(null)
        // Still show fuzzy student results for the rest string
        const generalResults = fuseRef.current.search(restStr)
        setStudents(generalResults.map(r => r.item).slice(0, 8))
        return
      }

      if (action === 'RENEW') {
        const fullQuery = rest.join(' ')
        let resolvedPlan = matchPlan(fullQuery, plans)
        // Support "same plan" shortcut
        if (!resolvedPlan && (q.toLowerCase().includes('same plan') || q.toLowerCase().includes('same'))) {
          resolvedPlan = matchedStudent.bookings?.[0]?.plan || null
        }
        setParsedCommand({
          action: 'RENEW',
          student: matchedStudent,
          plan: resolvedPlan,
          paymentMethod: detectPayment(q),
          startDate: detectDate(q),
        })
      } else if (action === 'REVOKE') {
        if (matchedStudent.bookings?.length > 0) {
          setParsedCommand({ action: 'REVOKE', student: matchedStudent })
        } else {
          setParsedCommand(null)
        }
      } else if (action === 'CHANGE_DATE') {
        const parsedDate = detectDate(q)
        setParsedCommand({
          action: 'CHANGE_DATE',
          student: matchedStudent,
          startDate: parsedDate,
        })
      }
      setStudents([])
    } else {
      // No action prefix — just fuzzy search students
      setParsedCommand(null)
      const results = fuseRef.current.search(q)
      setStudents(results.map(r => r.item).slice(0, 8))
    }
  }, [searchQuery, activePage, plans, allStudents])

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  React.useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setPages(['home'])
        setSearchQuery("")
        setSelectedStudent(null)
        setParsedCommand(null)
        setSelectedPlan(null)
        setNewStartDate("")
      }, 300)
    }
  }, [open])

  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  if (!mounted) return null
  if (!open) return null

  const handleRenew = async (paymentMode: string, studentData: any, planData: any) => {
    setIsExecuting(true);
    const activeBooking = studentData.bookings[0];
    try {
      const res = await renewPlan(activeBooking.id, paymentMode, planData ? planData.id : activeBooking.planId);
      if (res.error) toast.error(res.error);
      else { toast.success("Plan renewed successfully"); setOpen(false); router.refresh(); }
    } catch { toast.error("Failed to renew"); }
    setIsExecuting(false);
  }

  const handleRevoke = async (studentData: any) => {
    setIsExecuting(true);
    const activeBooking = studentData.bookings[0];
    try {
      const res = await revokeBooking(activeBooking.id, "Revoked via Command Palette");
      if (res.error) toast.error(res.error);
      else { toast.success("Access revoked"); setOpen(false); router.refresh(); }
    } catch { toast.error("Failed to revoke"); }
    setIsExecuting(false);
  }

  const handleChangeDate = async () => {
    setIsExecuting(true);
    const activeBooking = selectedStudent.bookings[0];
    try {
      const res = await updateBookingStartDate(activeBooking.id, new Date(newStartDate));
      if (res.error) toast.error(res.error);
      else { toast.success("Start date updated"); setOpen(false); router.refresh(); }
    } catch { toast.error("Failed to update date"); }
    setIsExecuting(false);
  }

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm transition-all duration-100 data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:animate-in data-[state=open]:fade-in" />
      
      <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
        <div className="w-full max-w-[640px] px-4">
          <Command
            className="w-full overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-2xl flex flex-col"
            loop
            onKeyDown={(e) => {
              if (e.key === "Backspace" && !searchQuery && pages.length > 1) {
                e.preventDefault()
                setPages((pages) => pages.slice(0, -1))
              }
            }}
          >
            <div className="flex items-center border-b border-border px-3">
              {isExecuting || isSearching ? <Loader2 className="mr-2 h-4 w-4 shrink-0 opacity-50 animate-spin" /> : <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />}
              <Command.Input 
                autoFocus
                value={searchQuery}
                onValueChange={setSearchQuery}
                className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50" 
                placeholder={activePage === 'home' ? "Type a command or search students (e.g. 'renew Piyush')..." : "Search options..."} 
                disabled={isExecuting}
              />
              <div className="ml-2 text-[10px] text-muted-foreground font-medium px-1.5 py-0.5 rounded border border-border bg-muted/50 tracking-widest whitespace-nowrap">
                {pages.length > 1 ? "BACKSPACE" : "ESC"}
              </div>
            </div>
            
            <Command.List className="max-h-[400px] overflow-y-auto overflow-x-hidden p-2">
              <Command.Empty className="py-6 text-center text-sm text-muted-foreground">No results found.</Command.Empty>
              
              {parsedCommand && activePage === 'home' && (
                <Command.Group heading="Command Parsed" className="text-xs font-medium text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
                  <div className="p-4 flex flex-col items-center justify-center text-center">
                    <p className="text-sm font-medium mb-1">
                      Action: <strong className="text-primary">
                        {parsedCommand.action === 'RENEW' ? 'Renew Plan' : parsedCommand.action === 'REVOKE' ? 'Revoke Access' : 'Change Start Date'}
                      </strong>
                    </p>
                    <p className="text-sm text-muted-foreground mb-2">
                      Target: {parsedCommand.student.name} ({parsedCommand.student.uniqueId})
                    </p>

                    {/* Show what slots were filled */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {parsedCommand.plan && (
                        <span className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">✓ Plan detected</span>
                      )}
                      {parsedCommand.paymentMethod && (
                        <span className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">✓ {parsedCommand.paymentMethod === 'CASH' ? 'Cash' : 'Online'}</span>
                      )}
                      {parsedCommand.startDate && (
                        <span className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                          ✓ From {parsedCommand.startDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      )}
                      {parsedCommand.action === 'RENEW' && !parsedCommand.plan && (
                        <span className="text-[11px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">⚠ Plan not specified</span>
                      )}
                      {parsedCommand.action === 'RENEW' && !parsedCommand.paymentMethod && (
                        <span className="text-[11px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">⚠ Payment not specified</span>
                      )}
                    </div>

                    {parsedCommand.action === 'RENEW' && parsedCommand.plan && (
                      <div className="w-full text-left">
                        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Plan to Renew</p>
                        <PlanCard plan={parsedCommand.plan} />
                      </div>
                    )}
                  </div>
                  <Command.Item
                    value={`${searchQuery} confirm execute`}
                    onSelect={() => {
                      if (parsedCommand.action === 'RENEW') {
                        setSelectedStudent(parsedCommand.student);
                        setSelectedPlan(parsedCommand.plan);
                        if (parsedCommand.plan) {
                          setPages([...pages, 'renew-confirm']);
                        } else {
                          setPages([...pages, 'renew-plan']);
                        }
                      } else if (parsedCommand.action === 'REVOKE') {
                        handleRevoke(parsedCommand.student);
                      } else if (parsedCommand.action === 'CHANGE_DATE') {
                        setSelectedStudent(parsedCommand.student);
                        if (parsedCommand.startDate) {
                          setNewStartDate(parsedCommand.startDate.toISOString().split('T')[0]);
                        }
                        setPages([...pages, 'change-date']);
                      }
                    }}
                    className="relative flex cursor-pointer select-none items-center justify-center rounded-md px-2 py-2.5 text-sm outline-none aria-selected:bg-primary aria-selected:text-primary-foreground mb-2"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    <span>Confirm & Continue</span>
                  </Command.Item>
                  <Command.Item
                    value={`${searchQuery} cancel`}
                    onSelect={() => { setParsedCommand(null); setSearchQuery(""); }}
                    className="relative flex cursor-pointer select-none items-center rounded-md px-2 py-2.5 text-sm outline-none aria-selected:bg-destructive aria-selected:text-destructive-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 mt-1"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    <span>Cancel</span>
                  </Command.Item>
                </Command.Group>
              )}

              {!parsedCommand && activePage === 'home' && students.length > 0 && (
                <Command.Group heading="Students" className="text-xs font-medium text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
                  {students.map((student) => (
                    <Command.Item
                      key={student.id}
                      value={`${searchQuery} ${student.name} ${student.phone} ${student.uniqueId}`}
                      onSelect={() => {
                        setSelectedStudent(student)
                        setSearchQuery("")
                        setPages([...pages, 'student-actions'])
                      }}
                      className="relative flex cursor-pointer select-none items-center rounded-md px-2 py-2.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                    >
                      <User className="mr-2 h-4 w-4" />
                      <div className="flex flex-col">
                        <span>{student.name}</span>
                        <span className="text-xs text-muted-foreground">{student.phone} • {student.uniqueId}</span>
                      </div>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {!parsedCommand && activePage === 'home' && students.length === 0 && (
                <>
                  <Command.Group heading="Quick Actions" className="text-xs font-medium text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
                    <Command.Item
                      onSelect={() => { setOpen(false); router.push("/dashboard/students?action=add-student") }}
                      className="relative flex cursor-pointer select-none items-center rounded-md px-2 py-2.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      <span>Add New Student</span>
                    </Command.Item>
                  </Command.Group>

                  <Command.Group heading="Navigation" className="text-xs font-medium text-muted-foreground mt-2 pt-2 border-t border-border [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
                    <Command.Item onSelect={() => { setOpen(false); router.push("/dashboard") }} className="relative flex cursor-pointer select-none items-center rounded-md px-2 py-2.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground"><Briefcase className="mr-2 h-4 w-4" /><span>Dashboard Overview</span></Command.Item>
                    <Command.Item onSelect={() => { setOpen(false); router.push("/dashboard/students") }} className="relative flex cursor-pointer select-none items-center rounded-md px-2 py-2.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground"><Users className="mr-2 h-4 w-4" /><span>Students</span></Command.Item>
                    <Command.Item onSelect={() => { setOpen(false); router.push("/dashboard/approvals") }} className="relative flex cursor-pointer select-none items-center rounded-md px-2 py-2.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground"><ListChecks className="mr-2 h-4 w-4" /><span>Pending Approvals</span></Command.Item>
                    <Command.Item onSelect={() => { setOpen(false); router.push("/dashboard/financials") }} className="relative flex cursor-pointer select-none items-center rounded-md px-2 py-2.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground"><Banknote className="mr-2 h-4 w-4" /><span>Financials</span></Command.Item>
                    <Command.Item onSelect={() => { setOpen(false); router.push("/dashboard/seats") }} className="relative flex cursor-pointer select-none items-center rounded-md px-2 py-2.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground"><Armchair className="mr-2 h-4 w-4" /><span>Manage Seats</span></Command.Item>
                    <Command.Item onSelect={() => { setOpen(false); router.push("/dashboard/queries") }} className="relative flex cursor-pointer select-none items-center rounded-md px-2 py-2.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground"><MessageSquare className="mr-2 h-4 w-4" /><span>Queries</span></Command.Item>
                  </Command.Group>
                </>
              )}

              {activePage === 'student-actions' && selectedStudent && (
                <Command.Group heading={`Actions for ${selectedStudent.name}`} className="text-xs font-medium text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
                  <Command.Item
                    onSelect={() => { setOpen(false); router.push(`/dashboard/students?action=view-profile&studentId=${selectedStudent.id}`) }}
                    className="relative flex cursor-pointer select-none items-center rounded-md px-2 py-2.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground"
                  >
                    <User className="mr-2 h-4 w-4" />
                    <span>View Profile</span>
                  </Command.Item>
                  
                  {selectedStudent.bookings && selectedStudent.bookings.length > 0 && (
                    <>
                      <Command.Item
                        onSelect={() => {
                          setSearchQuery("");
                          setPages([...pages, 'renew-plan']);
                        }}
                        className="relative flex cursor-pointer select-none items-center rounded-md px-2 py-2.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground mt-1"
                      >
                        <Banknote className="mr-2 h-4 w-4" />
                        <span>Renew Plan</span>
                        <ArrowRight className="ml-auto h-4 w-4 opacity-50" />
                      </Command.Item>

                      <Command.Item
                        onSelect={() => { setSearchQuery(""); setPages([...pages, 'change-date']) }}
                        className="relative flex cursor-pointer select-none items-center rounded-md px-2 py-2.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground mt-1"
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        <span>Change Start Date</span>
                        <ArrowRight className="ml-auto h-4 w-4 opacity-50" />
                      </Command.Item>

                      <Command.Item
                        onSelect={() => handleRevoke(selectedStudent)}
                        className="relative flex cursor-pointer select-none items-center rounded-md px-2 py-2.5 text-sm outline-none aria-selected:bg-destructive aria-selected:text-destructive-foreground mt-1 text-destructive"
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        <span>Revoke Access</span>
                      </Command.Item>
                    </>
                  )}
                </Command.Group>
              )}

              {activePage === 'renew-plan' && (
                <div className="px-2">
                  <Command.Group heading="Select Plan to Renew">
                    {selectedStudent?.bookings?.[0]?.plan && (
                       <Command.Item
                       onSelect={() => {
                          setSelectedPlan(selectedStudent.bookings[0].plan);
                          setPages([...pages, 'renew-confirm']);
                       }}
                       className="group mb-3 cursor-pointer outline-none block p-0 bg-transparent data-[selected=true]:bg-transparent"
                     >
                       <PlanCard plan={selectedStudent.bookings[0].plan} />
                     </Command.Item>
                    )}
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t border-border mt-1">Or Choose a Different Plan:</div>
                    {plans.map((plan: any) => (
                      <Command.Item
                        key={plan.id}
                        onSelect={() => {
                           setSelectedPlan(plan);
                           setPages([...pages, 'renew-confirm']);
                        }}
                        className="group mb-3 cursor-pointer outline-none block p-0 bg-transparent data-[selected=true]:bg-transparent"
                      >
                        <PlanCard plan={plan} />
                      </Command.Item>
                    ))}
                  </Command.Group>
                </div>
              )}

              {activePage === 'renew-confirm' && (
                <Command.Group heading="Confirm Payment Method">
                  {selectedPlan && (
                    <div className="px-4 mb-4">
                      <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Selected Plan</p>
                      <PlanCard plan={selectedPlan} />
                      {(() => {
                        const latestBooking = selectedStudent?.bookings?.[0];
                        if (!latestBooking) return null;
                        const now = new Date();
                        const currentEnd = new Date(latestBooking.endDate);
                        let start = new Date();
                        if (currentEnd > now) {
                          start = new Date(currentEnd);
                          start.setDate(start.getDate() + 1);
                        }
                        const end = new Date(start);
                        end.setDate(end.getDate() + selectedPlan.validityDays - 1);
                        
                        return (
                          <div className="mt-3 bg-primary/5 border border-primary/20 rounded-lg p-3">
                            <p className="text-[13px] text-muted-foreground mb-1">This plan will be active from:</p>
                            <div className="flex justify-between items-center text-sm font-semibold text-primary">
                              <span>{start.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                              <ArrowRight className="h-4 w-4 opacity-50" />
                              <span>{end.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                  <div className="px-2">
                    {parsedCommand?.paymentMethod ? (
                      <Command.Item
                        onSelect={() => handleRenew(parsedCommand.paymentMethod, selectedStudent, selectedPlan)}
                        className="relative flex cursor-pointer select-none items-center rounded-md px-2 py-2.5 text-sm outline-none aria-selected:bg-primary aria-selected:text-primary-foreground mb-1"
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        <span>Confirm Execution ({parsedCommand.paymentMethod === 'CASH' ? 'Cash' : 'Online'})</span>
                      </Command.Item>
                    ) : (
                      <>
                        <Command.Item
                          onSelect={() => handleRenew("CASH", selectedStudent, selectedPlan)}
                          className="relative flex cursor-pointer select-none items-center rounded-md px-2 py-2.5 text-sm outline-none aria-selected:bg-primary aria-selected:text-primary-foreground mb-1"
                        >
                          <Banknote className="mr-2 h-4 w-4" />
                          <span>Mark as Cash Paid</span>
                        </Command.Item>
                        <Command.Item
                          onSelect={() => handleRenew("ONLINE", selectedStudent, selectedPlan)}
                          className="relative flex cursor-pointer select-none items-center rounded-md px-2 py-2.5 text-sm outline-none aria-selected:bg-primary aria-selected:text-primary-foreground"
                        >
                          <Banknote className="mr-2 h-4 w-4" />
                          <span>Mark as Online Paid</span>
                        </Command.Item>
                      </>
                    )}
                  </div>
                </Command.Group>
              )}

              {activePage === 'change-date' && (
                <div className="px-2">
                  <Command.Group heading="Change Start Date">
                    {selectedStudent?.bookings?.[0]?.plan && (
                      <div className="mb-4">
                        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Active Plan</p>
                        <PlanCard plan={selectedStudent.bookings[0].plan} />
                      </div>
                    )}
                    <div className="p-2 flex flex-col gap-2">
                      <label className="text-sm font-medium text-foreground">New Start Date</label>
                      <input 
                        type="date"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={newStartDate}
                        onChange={(e) => setNewStartDate(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleChangeDate();
                          }
                        }}
                        autoFocus
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        We will automatically adjust the End Date to ensure the plan duration remains exactly the same.
                        {newStartDate && selectedStudent?.bookings?.[0]?.plan && (
                          <span className="block mt-2 bg-primary/10 p-2 rounded border border-primary/20 text-primary font-medium">
                            Projected End Date: {
                              (() => {
                                const d = new Date(newStartDate);
                                d.setDate(d.getDate() + selectedStudent.bookings[0].plan.validityDays - 1);
                                return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                              })()
                            }
                          </span>
                        )}
                      </p>
                      <button
                        onClick={handleChangeDate}
                        className="mt-2 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 rounded-md w-full text-sm font-medium flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Confirm Change
                      </button>
                    </div>
                  </Command.Group>
                </div>
              )}

            </Command.List>
          </Command>
        </div>
      </div>
    </>
  )
}
