"use client"

import * as React from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Command } from "cmdk"
import { Search, UserPlus, Users, Banknote, ListChecks, MessageSquare, Briefcase, Armchair, Loader2, ArrowRight, User, Calendar, XCircle, CheckCircle2 } from "lucide-react"
import { renewPlan, revokeBooking, updateBookingStartDate, getLibraryPlansForCmdk } from "@/app/actions/student-actions"
import toast from "react-hot-toast"
import { PlanCard } from "../PlanCard"

type CommandPlan = {
  id: string
  name: string
  validityDays: number
  durationHours: number | null
  price: number
  discount?: number | null
}

type CommandBooking = {
  id: string
  planId: string
  seatId: string | null
  startTime: string | Date
  endTime: string | Date
  status: string
  plan: CommandPlan
  seat?: { id: string; name: string } | null
}

type CommandStudent = {
  id: string
  name: string
  phone: string | null
  uniqueId: string | null
  bookings: CommandBooking[]
}

type StudentSearchResponse = {
  students?: CommandStudent[]
}

type ViewState = 
  | 'HOME' 
  | 'SEARCH_STUDENT' 
  | 'RENEW_SELECT_PLAN' 
  | 'RENEW_SELECT_PAYMENT' 
  | 'RENEW_CONFIRM'
  | 'REVOKE_CONFIRM'
  | 'CHANGE_DATE_INPUT';

type CommandContext = {
  action: 'RENEW' | 'REVOKE' | 'CHANGE_DATE' | null;
  student: CommandStudent | null;
  plan: CommandPlan | null;
  paymentMethod: 'CASH' | 'ONLINE' | null;
  startDate: Date | null;
}

export function CommandPalette() {
  const [open, setOpen] = React.useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [viewStack, setViewStack] = React.useState<ViewState[]>(['HOME'])
  const activeView = viewStack[viewStack.length - 1]

  const [context, setContext] = React.useState<CommandContext>({
    action: null,
    student: null,
    plan: null,
    paymentMethod: null,
    startDate: null,
  })

  const [searchQuery, setSearchQuery] = React.useState("")
  const [students, setStudents] = React.useState<CommandStudent[]>([])
  const [isSearching, setIsSearching] = React.useState(false)
  
  const [plans, setPlans] = React.useState<CommandPlan[]>([])
  const [plansLoaded, setPlansLoaded] = React.useState(false)
  
  const [newStartDate, setNewStartDate] = React.useState<string>("")
  const [isExecuting, setIsExecuting] = React.useState(false)

  // Fetch plans once
  React.useEffect(() => {
    if (open && !plansLoaded) {
      getLibraryPlansForCmdk().then((result) => {
        if (result.plans) setPlans(result.plans)
        setPlansLoaded(true)
      })
    }
  }, [open, plansLoaded])

  // Global hotkey
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

  // Reset state on close
  React.useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setViewStack(['HOME'])
        setContext({ action: null, student: null, plan: null, paymentMethod: null, startDate: null })
        setSearchQuery("")
        setNewStartDate("")
        setStudents([])
      }, 300)
    }
  }, [open])

  const pushView = (view: ViewState) => {
    setSearchQuery("")
    setViewStack([...viewStack, view])
  }

  const popView = () => {
    if (viewStack.length > 1) {
      setSearchQuery("")
      setViewStack(viewStack.slice(0, -1))
    }
  }

  // --- Student Search ---
  React.useEffect(() => {
    if (activeView !== 'HOME' && activeView !== 'SEARCH_STUDENT') return;
    if (searchQuery.trim().length < 2) {
      setStudents([])
      return
    }

    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setIsSearching(true)
      try {
        const response = await fetch(
          `/api/dashboard/students/search?q=${encodeURIComponent(searchQuery.trim())}`,
          { signal: controller.signal, cache: "no-store" },
        )
        if (!response.ok) throw new Error("Student search failed")
        const result = await response.json() as StudentSearchResponse
        setStudents(Array.isArray(result.students) ? result.students : [])
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setStudents([])
        }
      } finally {
        if (!controller.signal.aborted) setIsSearching(false)
      }
    }, 225)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [searchQuery, activeView])

  // Context Auto-Fill helper
  const tryAutoFillStudent = async (): Promise<boolean> => {
    // Basic auto-fill: Check URL
    const studentId = searchParams.get("studentId");
    if (studentId) {
      // In a real implementation we would look up the student details from a local cache or API
      // For now, if we don't have the full object, we fall back to manual search.
    }
    return false;
  }

  // --- Action Handlers ---
  const handleStartRenew = async () => {
    setContext(prev => ({ ...prev, action: 'RENEW' }))
    const autoFilled = await tryAutoFillStudent()
    if (!autoFilled) {
      pushView('SEARCH_STUDENT')
    } else {
      pushView('RENEW_SELECT_PLAN')
    }
  }

  const executeRenew = async () => {
    if (!context.student || !context.plan || !context.paymentMethod) return;
    
    setIsExecuting(true);
    const activeBooking = context.student.bookings[0];
    if (!activeBooking) {
      toast.error("No active booking found");
      setIsExecuting(false);
      return;
    }
    
    try {
      const res = await renewPlan(activeBooking.id, context.paymentMethod, context.plan.id);
      if (res.error) toast.error(res.error);
      else { 
        toast.success("Plan renewed successfully"); 
        setOpen(false); 
        router.refresh(); 
      }
    } catch { toast.error("Failed to renew"); }
    setIsExecuting(false);
  }

  const handleStartRevoke = async () => {
    setContext(prev => ({ ...prev, action: 'REVOKE' }))
    const autoFilled = await tryAutoFillStudent()
    if (!autoFilled) {
      pushView('SEARCH_STUDENT')
    } else {
      pushView('REVOKE_CONFIRM')
    }
  }

  const executeRevoke = async () => {
    if (!context.student) return;
    setIsExecuting(true);
    const activeBooking = context.student.bookings[0];
    if (!activeBooking) {
      toast.error("No active booking found");
      setIsExecuting(false);
      return;
    }
    try {
      const res = await revokeBooking(activeBooking.id, "Revoked via Command Palette");
      if (res.error) toast.error(res.error);
      else { 
        toast.success("Access revoked"); 
        setOpen(false); 
        router.refresh(); 
      }
    } catch { toast.error("Failed to revoke"); }
    setIsExecuting(false);
  }

  const handleStartChangeDate = async () => {
    setContext(prev => ({ ...prev, action: 'CHANGE_DATE' }))
    const autoFilled = await tryAutoFillStudent()
    if (!autoFilled) {
      pushView('SEARCH_STUDENT')
    } else {
      pushView('CHANGE_DATE_INPUT')
    }
  }

  const executeChangeDate = async () => {
    if (!context.student || !newStartDate) return;
    setIsExecuting(true);
    const activeBooking = context.student.bookings[0];
    if (!activeBooking) {
      toast.error("No active booking found");
      setIsExecuting(false);
      return;
    }
    try {
      const res = await updateBookingStartDate(activeBooking.id, new Date(newStartDate));
      if (res.error) toast.error(res.error);
      else { 
        toast.success("Start date updated"); 
        setOpen(false); 
        router.refresh(); 
      }
    } catch { toast.error("Failed to update date"); }
    setIsExecuting(false);
  }

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm transition-all duration-100 data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:animate-in data-[state=open]:fade-in" />
      
      <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
        <div className="w-full max-w-[640px] px-4">
          <Command
            className="w-full overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-2xl flex flex-col"
            loop
            onKeyDown={(e) => {
              if (e.key === "Backspace" && !searchQuery && viewStack.length > 1) {
                e.preventDefault()
                popView()
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
                placeholder={
                  activeView === 'HOME' ? "Type a command or search students..." : 
                  activeView === 'SEARCH_STUDENT' ? "Search student by name or phone..." :
                  activeView === 'RENEW_SELECT_PLAN' ? "Select a plan..." :
                  activeView === 'RENEW_SELECT_PAYMENT' ? "Select payment method..." :
                  "Press Enter to confirm..."
                } 
                disabled={isExecuting || activeView === 'RENEW_CONFIRM'}
              />
              <div className="ml-2 text-[10px] text-muted-foreground font-medium px-1.5 py-0.5 rounded border border-border bg-muted/50 tracking-widest whitespace-nowrap">
                {viewStack.length > 1 ? "BACKSPACE" : "ESC"}
              </div>
            </div>
            
            <Command.List className="max-h-[400px] overflow-y-auto overflow-x-hidden p-2">
              <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
                {isSearching ? "Searching..." : "No results found."}
              </Command.Empty>
              
              {/* --- VIEW: HOME --- */}
              {activeView === 'HOME' && searchQuery.trim().length >= 2 && students.length > 0 && (
                <Command.Group heading="Students" className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                  {students.map((student) => (
                    <Command.Item
                      key={student.id}
                      value={`student ${student.name} ${student.phone} ${student.uniqueId}`}
                      onSelect={() => {
                        setOpen(false)
                        router.push(`/dashboard/students?action=view-profile&studentId=${student.id}`)
                      }}
                      className="relative flex cursor-pointer select-none items-center rounded-md px-2 py-2.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground"
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

              {activeView === 'HOME' && searchQuery.trim().length < 2 && (
                <>
                  <Command.Group heading="Student Actions" className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    <Command.Item
                      keywords={['renew', 'extend', 'subscribe', 'upgrade']}
                      onSelect={handleStartRenew}
                      className="relative flex cursor-pointer select-none items-center rounded-md px-2 py-2.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground"
                    >
                      <Banknote className="mr-2 h-4 w-4 text-emerald-500" />
                      <span>Renew Plan</span>
                    </Command.Item>
                    <Command.Item
                      keywords={['date', 'startdate', 'changedate']}
                      onSelect={handleStartChangeDate}
                      className="relative flex cursor-pointer select-none items-center rounded-md px-2 py-2.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground mt-1"
                    >
                      <Calendar className="mr-2 h-4 w-4 text-blue-500" />
                      <span>Change Start Date</span>
                    </Command.Item>
                    <Command.Item
                      keywords={['revoke', 'cancel', 'remove']}
                      onSelect={handleStartRevoke}
                      className="relative flex cursor-pointer select-none items-center rounded-md px-2 py-2.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground mt-1"
                    >
                      <XCircle className="mr-2 h-4 w-4 text-red-500" />
                      <span>Revoke Access</span>
                    </Command.Item>
                  </Command.Group>

                  <Command.Group heading="Navigation" className="px-2 py-1.5 text-xs font-medium text-muted-foreground border-t border-border mt-2">
                    <Command.Item onSelect={() => { setOpen(false); router.push("/dashboard") }} className="relative flex cursor-pointer select-none items-center rounded-md px-2 py-2.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground"><Briefcase className="mr-2 h-4 w-4" /><span>Dashboard Overview</span></Command.Item>
                    <Command.Item onSelect={() => { setOpen(false); router.push("/dashboard/students") }} className="relative flex cursor-pointer select-none items-center rounded-md px-2 py-2.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground"><Users className="mr-2 h-4 w-4" /><span>Students</span></Command.Item>
                    <Command.Item onSelect={() => { setOpen(false); router.push("/dashboard/seats") }} className="relative flex cursor-pointer select-none items-center rounded-md px-2 py-2.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground"><Armchair className="mr-2 h-4 w-4" /><span>Manage Seats</span></Command.Item>
                  </Command.Group>
                </>
              )}

              {/* --- VIEW: SEARCH_STUDENT --- */}
              {activeView === 'SEARCH_STUDENT' && (
                <Command.Group heading={`Select Student for ${context.action}`} className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                  {students.map((student) => (
                    <Command.Item
                      key={student.id}
                      value={`${student.name} ${student.phone} ${student.uniqueId}`}
                      onSelect={() => {
                        setContext(prev => ({ ...prev, student }))
                        if (context.action === 'RENEW') pushView('RENEW_SELECT_PLAN')
                        else if (context.action === 'REVOKE') pushView('REVOKE_CONFIRM')
                        else if (context.action === 'CHANGE_DATE') pushView('CHANGE_DATE_INPUT')
                      }}
                      className="relative flex cursor-pointer select-none items-center rounded-md px-2 py-2.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground"
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

              {/* --- VIEW: RENEW_SELECT_PLAN --- */}
              {activeView === 'RENEW_SELECT_PLAN' && (
                <Command.Group heading="Select Plan to Renew" className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                  {context.student?.bookings?.[0]?.plan && (
                    <>
                      <div className="px-2 mb-1">Current Plan:</div>
                      <Command.Item
                        value={`current ${context.student.bookings[0].plan.name}`}
                        onSelect={() => {
                          setContext(prev => ({ ...prev, plan: context.student!.bookings[0].plan }))
                          pushView('RENEW_SELECT_PAYMENT')
                        }}
                        className="group mb-3 cursor-pointer outline-none block p-0 bg-transparent data-[selected=true]:bg-transparent"
                      >
                        <PlanCard plan={context.student.bookings[0].plan} />
                      </Command.Item>
                      <div className="px-2 mb-1 border-t border-border pt-2 mt-2">Other Plans:</div>
                    </>
                  )}
                  {plans.map((plan) => (
                    <Command.Item
                      key={plan.id}
                      value={plan.name}
                      onSelect={() => {
                        setContext(prev => ({ ...prev, plan }))
                        pushView('RENEW_SELECT_PAYMENT')
                      }}
                      className="group mb-3 cursor-pointer outline-none block p-0 bg-transparent data-[selected=true]:bg-transparent"
                    >
                      <PlanCard plan={plan} />
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {/* --- VIEW: RENEW_SELECT_PAYMENT --- */}
              {activeView === 'RENEW_SELECT_PAYMENT' && (
                <Command.Group heading="Select Payment Method" className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                  <Command.Item
                    onSelect={() => {
                      setContext(prev => ({ ...prev, paymentMethod: 'CASH' }))
                      pushView('RENEW_CONFIRM')
                    }}
                    className="relative flex cursor-pointer select-none items-center rounded-md px-2 py-2.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground"
                  >
                    <Banknote className="mr-2 h-4 w-4" />
                    <span>Cash</span>
                  </Command.Item>
                  <Command.Item
                    onSelect={() => {
                      setContext(prev => ({ ...prev, paymentMethod: 'ONLINE' }))
                      pushView('RENEW_CONFIRM')
                    }}
                    className="relative flex cursor-pointer select-none items-center rounded-md px-2 py-2.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground mt-1"
                  >
                    <Banknote className="mr-2 h-4 w-4" />
                    <span>Online (UPI/Card)</span>
                  </Command.Item>
                </Command.Group>
              )}

              {/* --- VIEW: RENEW_CONFIRM --- */}
              {activeView === 'RENEW_CONFIRM' && context.student && context.plan && (
                <Command.Group heading="Confirm Action" className="px-2">
                  <div className="p-4 flex flex-col items-center justify-center text-center">
                    <p className="text-sm font-medium mb-1">
                      Action: <strong className="text-primary">Renew Plan</strong>
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Target: {context.student.name}
                    </p>

                    <div className="w-full text-left mb-4">
                      <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Selected Plan</p>
                      <PlanCard plan={context.plan} />
                    </div>

                    <div className="w-full bg-muted/30 border border-border rounded-md p-3 mb-4 text-sm text-left flex items-center justify-between">
                      <span className="text-muted-foreground font-medium">Payment Method</span>
                      <span className="font-semibold">{context.paymentMethod === 'CASH' ? 'Cash' : 'Online'}</span>
                    </div>
                  </div>
                  
                  <Command.Item
                    onSelect={executeRenew}
                    className="relative flex cursor-pointer select-none items-center justify-center rounded-md px-2 py-3 text-sm font-medium outline-none aria-selected:bg-primary aria-selected:text-primary-foreground text-primary-foreground bg-primary"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    <span>Execute Renewal</span>
                  </Command.Item>
                </Command.Group>
              )}

              {/* --- VIEW: REVOKE_CONFIRM --- */}
              {activeView === 'REVOKE_CONFIRM' && context.student && (
                <Command.Group heading="Confirm Action" className="px-2">
                  <div className="p-4 flex flex-col items-center justify-center text-center">
                    <p className="text-sm font-medium mb-1">
                      Action: <strong className="text-destructive">Revoke Access</strong>
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Target: {context.student.name}
                    </p>
                    {context.student.bookings?.[0]?.plan && (
                      <div className="w-full text-left mb-4 opacity-50 grayscale">
                        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Active Plan to Revoke</p>
                        <PlanCard plan={context.student.bookings[0].plan} />
                      </div>
                    )}
                  </div>
                  
                  <Command.Item
                    onSelect={executeRevoke}
                    className="relative flex cursor-pointer select-none items-center justify-center rounded-md px-2 py-3 text-sm font-medium outline-none aria-selected:bg-destructive aria-selected:text-destructive-foreground text-destructive-foreground bg-destructive"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    <span>Execute Revocation</span>
                  </Command.Item>
                </Command.Group>
              )}

              {/* --- VIEW: CHANGE_DATE_INPUT --- */}
              {activeView === 'CHANGE_DATE_INPUT' && context.student && (
                <Command.Group heading="Change Start Date" className="px-2">
                  <div className="p-4 flex flex-col items-center justify-center text-left">
                    <p className="text-sm font-medium mb-1 w-full">
                      Target: {context.student.name}
                    </p>
                    {context.student.bookings?.[0]?.plan && (
                      <div className="w-full text-left mb-4">
                        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Active Plan</p>
                        <PlanCard plan={context.student.bookings[0].plan} />
                      </div>
                    )}
                    
                    <div className="w-full flex flex-col gap-2 mt-2">
                      <label className="text-sm font-medium text-foreground">New Start Date</label>
                      <input 
                        type="date"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={newStartDate}
                        onChange={(e) => setNewStartDate(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            executeChangeDate();
                          }
                        }}
                        autoFocus
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        We will automatically adjust the End Date to ensure the plan duration remains exactly the same.
                      </p>
                    </div>
                  </div>
                  
                  <Command.Item
                    onSelect={executeChangeDate}
                    className="relative flex cursor-pointer select-none items-center justify-center rounded-md px-2 py-3 text-sm font-medium outline-none aria-selected:bg-primary aria-selected:text-primary-foreground text-primary-foreground bg-primary mt-4"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    <span>Confirm Date Change</span>
                  </Command.Item>
                </Command.Group>
              )}

            </Command.List>
          </Command>
        </div>
      </div>
    </>
  )
}
