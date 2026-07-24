"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { 
  UserCheck, LayoutGrid, Timer, BellRing, 
  TrendingUp, ArrowUpRight, ArrowDownRight, 
  MoreHorizontal, ChevronDown, CheckCircle2, CheckSquare, Settings, Settings2, FileText, 
  MapPin, LogIn, LogOut, CreditCard, Wallet, BookOpen, UserPlus
} from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer 
} from 'recharts';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const dummyChartData = [
  { name: 'Jan', enrollments: 40, renewals: 24 },
  { name: 'Feb', enrollments: 30, renewals: 13 },
  { name: 'Mar', enrollments: 20, renewals: 98 },
  { name: 'Apr', enrollments: 27, renewals: 39 },
  { name: 'May', enrollments: 18, renewals: 48 },
  { name: 'Jun', enrollments: 23, renewals: 38 },
  { name: 'Jul', enrollments: 34, renewals: 43 },
];

const dummyRecentActivity = [
  { id: 1, type: 'ENROLL', student: 'Rahul Sharma', plan: '30 Days Premium', time: '10 mins ago', seat: 'Seat 42' },
  { id: 2, type: 'RENEWAL', student: 'Priya Patel', plan: '15 Days Standard', time: '25 mins ago', seat: 'Seat 12' },
  { id: 3, type: 'ENROLL', student: 'Amit Kumar', plan: '7 Days Flexible', time: '1 hour ago', seat: 'No Seat' },
];

const dummyTransactions = [
  { id: 1, time: '14:30', student: 'Rahul Sharma', method: 'Razorpay', amount: '₹1,500' },
  { id: 2, time: '12:15', student: 'Priya Patel', method: 'Renewal (Online)', amount: '₹600' },
  { id: 3, time: '10:00', student: 'Amit Kumar', method: 'Reception (Cash)', amount: '₹350' },
];

const dummyLiveAccess = [
  { id: 1, name: 'Sandeep V.', action: 'CHECK_IN', time: 'Just now', seat: 'Seat 42' },
  { id: 2, name: 'Kiran M.', action: 'CHECK_OUT', time: '5 mins ago', seat: 'Seat 12' },
  { id: 3, name: 'Arjun K.', action: 'CHECK_IN', time: '12 mins ago', seat: 'Seat 08' },
];

const dummyPendingApprovals = [
  { id: 1, student: 'Neha Singh', plan: 'Custom Plan', time: '2 hours ago' },
];

const dummyAttendance = [
  { id: 1, student: 'Vikas T.', time: '09:00 AM', status: 'CHECK_IN' },
  { id: 2, student: 'Sunita L.', time: '09:15 AM', status: 'CHECK_IN' },
];

const dummyStudentsInside = [
  { id: 1, name: 'Sandeep V.', pfp: 'https://i.pravatar.cc/150?u=11' },
  { id: 2, name: 'Arjun K.', pfp: 'https://i.pravatar.cc/150?u=22' },
  { id: 3, name: 'Vikram S.', pfp: 'https://i.pravatar.cc/150?u=33' },
  { id: 4, name: 'Priya P.', pfp: 'https://i.pravatar.cc/150?u=44' },
  { id: 5, name: 'Rahul S.', pfp: 'https://i.pravatar.cc/150?u=55' },
];

export default function OverviewMockupPage() {
  const [expandedStudent, setExpandedStudent] = useState<string | null>("Vikas T.");

  const [showInside, setShowInside] = useState(false);
  const studentsWidgetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (studentsWidgetRef.current && !studentsWidgetRef.current.contains(event.target as Node)) {
        setShowInside(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#FAFAFA] font-sans selection:bg-primary/20 pb-32">
      {/* Top Navbar / Header area */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-sm">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900 tracking-tight">Kripa Library</span>
            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[11px] font-bold uppercase tracking-wider">Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300"></div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        
        {/* Page Title & Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-[28px] font-black text-slate-900 tracking-tight leading-none">Overview</h1>
            <p className="text-sm font-medium text-slate-500 mt-2">Welcome back. Here is your library&apos;s pulse.</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-bold shadow-[0_2px_10px_-4px_var(--color-primary)] hover:opacity-90 transition-all active:scale-[0.98]">
              + New Booking
            </button>
          </div>
        </div>

        {/* Top Metric Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5 relative">
          
          {/* 1. Students Inside Widget (Hero Dark Mode) */}
          <div className="relative z-20" ref={studentsWidgetRef}>
            <div 
              className="bg-slate-900 p-7 rounded-[3rem] border border-slate-800 shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:border-slate-700 transition-all duration-300 group cursor-pointer flex flex-col justify-between h-full relative overflow-hidden"
              onClick={() => setShowInside(!showInside)}
            >
              {/* Subtle mesh glow behind */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#0085FF] opacity-20 blur-[50px] rounded-full pointer-events-none"></div>

              <div className="flex justify-between items-start mb-6 relative z-10">
                <span className="text-sm font-bold text-slate-300">Students Inside</span>
                <div className="p-2.5 bg-slate-800 rounded-xl group-hover:bg-slate-700 transition-colors">
                  <UserCheck className="w-5 h-5 text-[#0085FF] transition-colors" />
                </div>
              </div>
              
              <h3 className="text-5xl font-black text-white tracking-tight relative z-10">{dummyStudentsInside.length}</h3>
              
              <div className="mt-4 flex items-center gap-3 relative z-10">
                <div className="flex -space-x-2 overflow-hidden">
                   {dummyStudentsInside.slice(0, 4).map((student) => (
                     <img key={student.id} src={student.pfp} alt={student.name} className="inline-block h-8 w-8 rounded-full ring-2 ring-slate-900 object-cover shadow-sm" />
                   ))}
                   {dummyStudentsInside.length > 4 && (
                     <div className="inline-flex items-center justify-center h-8 w-8 rounded-full ring-2 ring-slate-900 bg-slate-800 text-[10px] font-bold text-white z-10 shadow-sm">
                       +{dummyStudentsInside.length - 4}
                     </div>
                   )}
                </div>
                <div className="text-[11px] font-bold text-slate-400 group-hover:text-slate-300 transition-colors">Tap to view &rarr;</div>
              </div>
            </div>

            {/* Absolute Popover for Students Inside */}
            {showInside && (
              <div className="absolute top-full left-0 mt-3 w-64 bg-white border border-slate-200 rounded-3xl shadow-xl p-4 z-50 flex flex-col gap-2">
                <div className="flex justify-between items-center mb-2 px-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Currently Inside</span>
                  <button onClick={() => setShowInside(false)} className="text-slate-400 hover:text-slate-900"><MoreHorizontal className="w-4 h-4" /></button>
                </div>
                {dummyStudentsInside.map(student => (
                  <Link key={student.id} href={`/design-sample/students/${student.id}`} className="flex items-center gap-3 w-full p-2 rounded-2xl hover:bg-slate-50 transition-colors text-left group">
                    <img src={student.pfp} alt={student.name} className="w-10 h-10 rounded-full object-cover border border-slate-100 shadow-sm" />
                    <div>
                      <div className="text-sm font-bold text-slate-900 group-hover:text-primary transition-colors">{student.name}</div>
                      <div className="text-[10px] font-semibold text-slate-400">View Profile &rarr;</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* 2. Active Students (Neon Brand Color) */}
          <div className="bg-[#C6F135] p-7 rounded-[3rem] border border-[#b5e022] shadow-[0_8px_30px_rgba(198,241,53,0.15)] hover:shadow-[0_8px_30px_rgba(198,241,53,0.25)] hover:-translate-y-1 transition-all duration-300 group cursor-default flex flex-col justify-between relative overflow-hidden">
            <div className="absolute -right-6 -top-6 w-32 h-32 bg-white opacity-20 rounded-full blur-[40px] pointer-events-none"></div>
            
            {/* Background Sparkline */}
            <div className="absolute bottom-0 left-0 right-0 h-28 opacity-[0.08] pointer-events-none">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dummyChartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <Area type="monotone" dataKey="enrollments" stroke="none" fill="#000000" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="flex justify-between items-start mb-6 relative z-10">
              <span className="text-sm font-bold text-slate-800">Active Students</span>
              <div className="p-2.5 bg-white/40 backdrop-blur-sm rounded-xl">
                <UserCheck className="w-5 h-5 text-slate-900" />
              </div>
            </div>
            <div className="relative z-10 mt-auto">
              <h3 className="text-5xl font-black text-slate-900 tracking-tight drop-shadow-sm">124</h3>
              <div className="mt-4 flex items-center gap-1.5 text-[11px] font-bold">
                <span className="text-slate-800/80 uppercase tracking-widest">Active today vs last 7 days</span>
              </div>
            </div>
          </div>

          {/* 3. Seat Occupancy (Clean White with Progress Bar) */}
          <div className="bg-white p-7 rounded-[3rem] border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-1 transition-all duration-300 group cursor-default flex flex-col justify-between">
            <div className="flex justify-between items-start mb-6">
              <span className="text-sm font-bold text-slate-500">Seat Occupancy</span>
              <div className="p-2.5 bg-slate-50 rounded-xl group-hover:bg-slate-100 transition-colors">
                <LayoutGrid className="w-5 h-5 text-slate-900" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <h3 className="text-5xl font-black text-slate-900 tracking-tight">82%</h3>
              </div>
              <div className="mt-4 w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div className="bg-slate-900 h-2.5 rounded-full" style={{ width: '82%' }}></div>
              </div>
              <div className="mt-2.5 text-[11px] font-bold text-slate-400">
                124 of 150 seats booked
              </div>
            </div>
          </div>

          {/* 4. Expiring Soon (White with Soft Vibrant Amber Glow) */}
          <div className="bg-white p-7 rounded-[3rem] border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-1 transition-all duration-300 group cursor-default flex flex-col justify-between relative overflow-hidden">
            <div className="absolute -right-12 -top-12 w-72 h-72 bg-amber-500/15 rounded-full blur-[60px] pointer-events-none group-hover:bg-amber-500/25 transition-colors duration-500"></div>
            <div className="flex justify-between items-start mb-6 relative z-10">
              <span className="text-sm font-bold text-slate-500">Expiring Soon</span>
              <div className="p-2.5 bg-white border border-slate-100 shadow-sm rounded-xl">
                <Timer className="w-5 h-5 text-amber-500" />
              </div>
            </div>
            <div className="relative z-10">
              <h3 className="text-5xl font-black text-slate-900 tracking-tight">12</h3>
              <div className="mt-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Action Needed</span>
              </div>
            </div>
          </div>

          {/* 5. New Queries (White with Soft Vibrant Blue Glow) */}
          <div className="bg-white p-7 rounded-[3rem] border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-1 transition-all duration-300 group cursor-default flex flex-col justify-between relative overflow-hidden">
            <div className="absolute -right-12 -bottom-12 w-72 h-72 bg-[#0085FF]/15 rounded-full blur-[60px] pointer-events-none group-hover:bg-[#0085FF]/25 transition-colors duration-500"></div>
            <div className="flex justify-between items-start mb-6 relative z-10">
              <span className="text-sm font-bold text-slate-500">New Queries (7d)</span>
              <div className="p-2.5 bg-white border border-slate-100 shadow-sm rounded-xl">
                <BellRing className="w-5 h-5 text-[#0085FF]" />
              </div>
            </div>
            <div className="relative z-10">
              <h3 className="text-5xl font-black text-slate-900 tracking-tight">3</h3>
              <div className="mt-4 flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                Reviews & complaints
              </div>
            </div>
          </div>
        </div>

                                {/* Main Layout Grid: Asymmetric Bento Box */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-6 items-start">
           
           {/* Left Main Content (2 columns wide) */}
           <div className="xl:col-span-2 flex flex-col gap-6">
              
              {/* 6. Admissions Chart (Moved to Top) */}
              <div className="bg-white border border-slate-200/60 rounded-[3rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
                  <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                      <h2 className="text-xl font-black text-slate-900 tracking-tight">Admissions Chart</h2>
                      <p className="text-[13px] font-semibold text-slate-500 mt-1">Enrollments vs Renewals over time</p>
                    </div>
                  </div>
                  <div className="p-6 h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dummyChartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorEnrollments" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--color-primary, #3b82f6)" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="var(--color-primary, #3b82f6)" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorRenewals" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 600 }} 
                          dy={10}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 600 }}
                        />
                        <Tooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-slate-900 text-white text-sm font-medium px-4 py-3 rounded-lg shadow-xl border border-slate-800">
                                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2 border-b border-slate-700 pb-2">{payload[0].payload.name}</p>
                                  <div className="flex flex-col gap-1.5">
                                     <div className="flex items-center gap-3 justify-between">
                                       <span className="flex items-center gap-1.5 text-slate-300 text-xs font-semibold"><div className="w-2 h-2 rounded-full bg-primary" /> Enrollments</span>
                                       <span className="font-bold">{payload[0].value}</span>
                                     </div>
                                     <div className="flex items-center gap-3 justify-between">
                                       <span className="flex items-center gap-1.5 text-slate-300 text-xs font-semibold"><div className="w-2 h-2 rounded-full bg-slate-400" /> Renewals</span>
                                       <span className="font-bold">{payload[1]?.value || 0}</span>
                                     </div>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                          cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                        />
                        <Area 
                          type="monotoneX" 
                          dataKey="enrollments" 
                          stroke="var(--color-primary, #3b82f6)" 
                          strokeWidth={3}
                          fillOpacity={1} 
                          fill="url(#colorEnrollments)" 
                          activeDot={{ r: 6, strokeWidth: 0, fill: 'var(--color-primary, #3b82f6)' }}
                        />
                        <Area 
                          type="monotoneX" 
                          dataKey="renewals" 
                          stroke="#94a3b8" 
                          strokeWidth={2}
                          fillOpacity={1} 
                          fill="url(#colorRenewals)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
              </div>

              {/* 5. Check-in Attendance */}
              <div className="bg-gradient-to-b from-white to-indigo-50/40 border border-slate-200/60 rounded-[3rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col overflow-hidden">
                  <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                     <div>
                       <h2 className="text-xl font-black text-slate-900 tracking-tight">Today&apos;s Attendance</h2>
                       <p className="text-[13px] font-semibold text-slate-500 mt-1">45 students currently active inside</p>
                     </div>
                     <div className="flex gap-3">
                       <button className="text-[13px] font-bold text-slate-700 bg-white border border-slate-200 px-4 py-2.5 rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] hover:bg-slate-50 hover:shadow-[0_4px_15px_rgba(0,0,0,0.06)] transition-all">Export Report</button>
                     </div>
                  </div>
                  <div className="p-0 overflow-x-auto w-full">
                     <table className="w-full text-left table-fixed border-collapse min-w-[700px]">
                        <thead className="bg-white">
                          <tr>
                            <th className="w-[35%] px-8 py-5 text-[10px] uppercase tracking-widest font-black text-slate-400 border-b border-slate-100">Student</th>
                            <th className="w-[20%] px-8 py-5 text-[10px] uppercase tracking-widest font-black text-slate-400 border-b border-slate-100">First In</th>
                            <th className="w-[20%] px-8 py-5 text-[10px] uppercase tracking-widest font-black text-slate-400 border-b border-slate-100">Last Out</th>
                            <th className="w-[25%] px-8 py-5 text-[10px] uppercase tracking-widest font-black text-slate-400 border-b border-slate-100">Total Hrs</th>
                            
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                    {[
                      {
                        name: "Vikas T.", avatar: "10", seat: "Seat 12", firstIn: "09:00 AM", lastOut: "—", totalHrs: "—",
                        events: [
                          { time: "09:00 AM", action: "CHECK IN", type: "in" },
                          { time: "10:15 AM", action: "CHECK OUT", type: "out" },
                          { time: "10:30 AM", action: "CHECK IN", type: "in" },
                          { time: "12:45 PM", action: "CHECK OUT", type: "out" },
                          { time: "01:15 PM", action: "CHECK IN", type: "in" },
                          { time: "03:30 PM", action: "CHECK OUT", type: "out" },
                          { time: "04:00 PM", action: "CHECK IN", type: "in" },
                          { time: "Checkout", action: "PENDING", type: "pending" }
                        ]
                      },
                      {
                        name: "Sunita L.", avatar: "15", seat: "Flexible Plan", firstIn: "10:30 AM", lastOut: "03:45 PM", totalHrs: "5h 15m",
                        events: [
                          { time: "10:30 AM", action: "CHECK IN", type: "in" },
                          { time: "03:45 PM", action: "CHECK OUT", type: "out" }
                        ]
                      }
                    ].map((student) => {
                      const isExpanded = expandedStudent === student.name;
                      return (
                        <React.Fragment key={student.name}>
                          <tr 
                            onClick={() => setExpandedStudent(isExpanded ? null : student.name)}
                            className="bg-white hover:bg-slate-50/50 transition-colors cursor-pointer group"
                          >
                            <td className="px-8 py-5">
                              <div className="flex items-center gap-4">
                                <img src={`https://i.pravatar.cc/150?u=${student.avatar}`} alt={student.name} className="w-10 h-10 rounded-full object-cover shadow-sm shrink-0" />
                                <div>
                                  <div className="text-[15px] font-black text-slate-900 group-hover:text-[#0085FF] transition-colors">{student.name}</div>
                                  <div className="text-[13px] font-semibold text-slate-500 mt-0.5">{student.seat}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-5">
                              <div className="text-[14px] font-bold text-slate-900">{student.firstIn}</div>
                            </td>
                            <td className="px-8 py-5">
                              <div className="text-[14px] font-bold text-slate-400">{student.lastOut}</div>
                            </td>
                            <td className="px-8 py-5">
                              <div className="flex items-center justify-between w-full">
                                <span className="text-[14px] font-bold text-slate-400">{student.totalHrs}</span>
                                <button className="text-[13px] font-bold text-slate-400 group-hover:text-[#0085FF] flex items-center transition-colors">
                                   <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-[#0085FF]' : ''}`} />
                                </button>
                              </div>
                            </td>
                          </tr>
                          
                          {isExpanded && (
                            <tr className="bg-slate-50/50 border-b-2 border-slate-100">
                              <td colSpan={4} className="px-8 py-6 relative">
                                  {/* Visual anchor linking the student to the timeline */}
                                  <div className="absolute left-[3.25rem] top-0 bottom-10 w-0.5 bg-slate-200 rounded-b-full z-0"></div>
                                  
                                  {/* Card container tightly pulled to the vertical line */}
                                  <div className="pl-10 pr-0 relative z-10 w-full">
                                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden w-full">
                                      
                                      {/* SCROLLING container */}
                                      <div 
                                        className="overflow-x-auto relative px-8 py-6"
                                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                                      >
                                        <style>{`
                                          .scrollbar-hide::-webkit-scrollbar { display: none; }
                                        `}</style>
                                        <div className="min-w-max flex items-start gap-12 relative scrollbar-hide">
                                          {/* Horizontal track line passing directly behind the pills */}
                                          <div className="absolute top-[13px] left-4 right-4 h-0.5 bg-slate-200 z-0"></div>
                                          
                                          {student.events.map((ev, i) => (
                                            <div key={i} className={`flex flex-col items-center gap-3 bg-white px-2 shrink-0 z-10 ${ev.type === 'pending' ? 'opacity-50' : ''}`}>
                                               <span className={`text-[10px] tracking-wider font-black px-3 py-1 rounded-full border-2 border-white shadow-sm
                                                  ${ev.type === 'in' ? 'bg-emerald-100 text-emerald-700' : 
                                                    ev.type === 'out' ? 'bg-slate-200 text-slate-600' : 
                                                    'bg-slate-100 text-slate-400 border-dashed'}
                                               `}>
                                                 {ev.action}
                                               </span>
                                               <span className={`text-[13px] font-bold ${ev.type === 'pending' ? 'text-slate-400' : 'text-slate-900'}`}>{ev.time}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                      </table>
                  </div>
              </div>

              {/* Transactions */}
              <div className="bg-gradient-to-b from-white to-emerald-50/30 border border-slate-200/60 rounded-[3rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col min-h-[400px] h-full overflow-hidden">
                 <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                      <h2 className="text-xl font-black text-slate-900 tracking-tight">Today&apos;s Transactions</h2>
                      <p className="text-[13px] font-semibold text-slate-500 mt-1">₹12,450 collected across 45 payments</p>
                    </div>
                    <button className="text-sm font-bold text-[#0085FF] hover:underline">View All</button>
                 </div>
                 <div className="flex-1 overflow-x-auto overflow-y-auto p-0">
                   <table className="w-full text-left border-collapse min-w-[500px]">
                      <thead className="bg-white sticky top-0">
                        <tr>
                          <th className="px-8 py-4 text-[10px] uppercase tracking-wider font-black text-slate-400 border-b border-slate-100">Time</th>
                          <th className="px-8 py-4 text-[10px] uppercase tracking-wider font-black text-slate-400 border-b border-slate-100">Details</th>
                          <th className="px-8 py-4 text-[10px] uppercase tracking-wider font-black text-slate-400 border-b border-slate-100 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {dummyTransactions.map((tx) => (
                          <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-8 py-5">
                              <div className="text-[13px] font-bold text-slate-900">{tx.time}</div>
                            </td>
                            <td className="px-8 py-5">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                                  {tx.method.includes('Razorpay') ? <CreditCard className="w-5 h-5 text-slate-500" /> : <Wallet className="w-5 h-5 text-slate-500" />}
                                </div>
                                <div>
                                  <Link href="/design-sample/students/123" className="text-[15px] font-bold text-slate-900 hover:text-[#0085FF] transition-colors inline-block">{tx.student}</Link>
                                  <div className="text-[13px] font-semibold text-emerald-600 mt-0.5 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>{tx.method}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-5 text-right">
                              <div className="text-[15px] font-black text-slate-900">{tx.amount}</div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                 </div>
              </div>

           </div>

           {/* Right Sidebar (1 column wide) */}
           <div className="flex flex-col gap-6 h-full">
              
              {/* Pending Approvals */}
              <div className="bg-white rounded-[3rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200 flex flex-col min-h-[420px] overflow-hidden">
                 <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white z-10">
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">Pending Approvals</h2>
                    <span className="text-[11px] font-black bg-[#0085FF] text-white px-3 py-1 rounded-full shadow-sm">1 NEW</span>
                 </div>
                 <div className="p-6 flex-1 overflow-y-auto bg-slate-50/50">
                    <div className="space-y-4">
                      {dummyPendingApprovals.map((app) => (
                         <div key={app.id} className="p-5 rounded-[2rem] bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-300 flex flex-col gap-4 group">
                            <div className="flex gap-4 items-center">
                              <img src="https://i.pravatar.cc/150?u=55" alt="Applicant" className="w-12 h-12 rounded-full object-cover border border-slate-100 shadow-sm group-hover:scale-105 transition-transform duration-300" />
                              <div>
                                <Link href="/design-sample/students/123" className="text-[15px] font-bold text-slate-900 hover:text-[#0085FF] transition-colors leading-tight inline-block">{app.student}</Link>
                                <div className="text-[13px] font-semibold text-slate-500 mt-0.5">{app.plan} &bull; {app.time}</div>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 w-full">
                               <button className="w-full px-4 py-2.5 text-[13px] font-bold bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-all duration-300">Reject</button>
                               <button className="w-full px-4 py-2.5 text-[13px] font-bold bg-[#C6F135] text-slate-900 rounded-2xl hover:brightness-95 transition-all shadow-sm hover:-translate-y-0.5 duration-300">Approve</button>
                            </div>
                         </div>
                      ))}
                    </div>
                 </div>
              </div>

              {/* Live Access Feed */}
              <div className="bg-white border border-slate-200/60 rounded-[3rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col min-h-[400px] overflow-hidden">
                  <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                    <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                      </span>
                      Live Access
                    </h2>
                    <button className="text-sm font-bold text-[#0085FF] hover:underline">View All</button>
                  </div>
                  <div className="p-6 flex-1 overflow-y-auto">
                    <div className="space-y-4">
                      {dummyLiveAccess.map((log, i) => (
                         <div key={log.id} className="flex items-start gap-5 p-4 hover:bg-slate-50/80 rounded-[2rem] transition-all duration-300 border border-transparent hover:border-slate-100 hover:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
                           <div className="relative shrink-0">
                             <img src={`https://i.pravatar.cc/150?u=${log.id + 30}`} alt={log.name} className="w-12 h-12 rounded-full object-cover shadow-sm group-hover:scale-105 transition-transform duration-300" />
                             <div className="absolute -bottom-1 -right-1 p-1 bg-white rounded-full shadow-sm">
                               <div className={`p-1 rounded-full ${log.action === 'CHECK_IN' ? 'bg-emerald-500' : 'bg-slate-400'} text-white`}>
                                 {log.action === 'CHECK_IN' ? <LogIn className="w-3 h-3" /> : <LogOut className="w-3 h-3" />}
                               </div>
                             </div>
                           </div>
                           <div className="flex-1 pt-1 flex justify-between items-start">
                             <div>
                               <p className="text-[15px] leading-tight">
                                 <Link href="/design-sample/students/123" className="font-bold text-slate-900 hover:text-[#0085FF] transition-colors">{log.name}</Link>
                               </p>
                               <div className="flex items-center gap-2 mt-1.5">
                                 <span className="text-[11px] font-bold text-slate-400">{log.time}</span>
                                 <span className="text-[11px] font-bold text-slate-400">&bull;</span>
                                 <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-1 rounded-lg uppercase tracking-wider">{log.seat}</span>
                               </div>
                             </div>
                             <div className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${log.action === 'CHECK_IN' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                               {log.action === 'CHECK_IN' ? 'CHECK IN' : 'CHECK OUT'}
                             </div>
                           </div>
                         </div>
                      ))}
                    </div>
                  </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-[3rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200 flex flex-col min-h-[420px] overflow-hidden group relative">
                <Sheet>
                  <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white z-10">
                      <h2 className="text-xl font-black text-slate-900 tracking-tight">Recent Activity</h2>
                      <SheetTrigger className="text-[13px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-4 py-1.5 rounded-full transition-colors">
                        View All
                      </SheetTrigger>
                   </div>
                 <div className="p-0 flex-1 overflow-y-auto">
                    <div className="divide-y divide-slate-100">
                       {/* New Enrollment */}
                       <div className="flex items-center justify-between px-8 py-5 hover:bg-slate-50 transition-all duration-300 cursor-pointer group/item">
                         <div className="flex items-center gap-4">
                           <div className="relative shrink-0">
                             <img src="https://i.pravatar.cc/150?u=12" alt="Kavya S." className="w-12 h-12 rounded-full object-cover border border-slate-100 shadow-sm group-hover/item:scale-105 transition-transform duration-300" />
                             <div className="absolute -bottom-1 -right-1 p-1 bg-white rounded-full shadow-sm">
                               <div className="p-1 bg-[#0085FF] text-white rounded-full"><UserPlus className="w-3 h-3" /></div>
                             </div>
                           </div>
                           <div>
                             <p className="text-[15px] leading-tight"><Link href="/design-sample/students/123" className="font-bold text-slate-900 hover:text-[#0085FF] transition-colors">Kavya S.</Link> <span className="font-medium text-slate-500">enrolled in Premium Plan</span></p>
                             <p className="text-[13px] font-bold text-[#0085FF] mt-1">Booked Seat 42</p>
                           </div>
                         </div>
                         <div className="text-[11px] font-bold text-slate-400 whitespace-nowrap ml-4">10:45 AM</div>
                       </div>

                       {/* Renewal */}
                       <div className="flex items-center justify-between px-8 py-5 hover:bg-slate-50 transition-all duration-300 cursor-pointer group/item">
                         <div className="flex items-center gap-4">
                           <div className="relative shrink-0">
                             <img src="https://i.pravatar.cc/150?u=45" alt="Rahul M." className="w-12 h-12 rounded-full object-cover border border-slate-100 shadow-sm group-hover/item:scale-105 transition-transform duration-300" />
                             <div className="absolute -bottom-1 -right-1 p-1 bg-white rounded-full shadow-sm">
                               <div className="p-1 bg-emerald-500 text-white rounded-full"><ArrowUpRight className="w-3 h-3" /></div>
                             </div>
                           </div>
                           <div>
                             <p className="text-[15px] leading-tight"><Link href="/design-sample/students/123" className="font-bold text-slate-900 hover:text-[#0085FF] transition-colors">Rahul M.</Link> <span className="font-medium text-slate-500">renewed membership</span></p>
                             <p className="text-[13px] font-bold text-emerald-600 mt-1">Standard Plan +30 days</p>
                           </div>
                         </div>
                         <div className="text-[11px] font-bold text-slate-400 whitespace-nowrap ml-4">09:12 AM</div>
                       </div>
                       
                       {/* Setting Change */}
                       <div className="flex items-center justify-between px-8 py-5 hover:bg-slate-50 transition-all duration-300 cursor-pointer group/item">
                         <div className="flex items-center gap-4">
                           <div className="relative shrink-0">
                             <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shadow-sm group-hover/item:scale-105 transition-transform duration-300">
                               <Settings className="w-5 h-5 text-slate-600" />
                             </div>
                           </div>
                           <div>
                             <p className="text-[15px] font-bold text-slate-900 leading-tight">Library Hours <span className="font-medium text-slate-500">updated</span></p>
                             <p className="text-[13px] font-medium text-slate-500 mt-1">Sunday opening changed to 10:00 AM</p>
                           </div>
                         </div>
                         <div className="text-[11px] font-bold text-slate-400 whitespace-nowrap ml-4">Yesterday</div>
                       </div>
                    </div>
                 </div>
                </Sheet>
              </div>
           </div>

        </div>
      </main>


    </div>
  );
}
