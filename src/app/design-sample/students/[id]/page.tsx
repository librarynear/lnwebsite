"use client";

import React from "react";
import Link from "next/link";
import { 
  ArrowLeft, ShieldCheck, Mail, Phone, Calendar, User, MapPin, 
  Clock, CalendarClock, CreditCard, ChevronRight, Download, MoreHorizontal,
  Activity, CheckCircle2, History
} from "lucide-react";

export default function StudentProfileMockupPage() {
  const student = {
    name: "Sandeep V.",
    uniqueId: "LIB-2026-8942",
    pfp: "https://i.pravatar.cc/150?u=11",
    isVerified: true,
    email: "sandeep.v@example.com",
    phone: "+91 98765 43210",
    dob: "14 Aug 2002",
    gender: "Male",
    address: "142, Galaxy Apartments, Sector 4, New Delhi",
    memberSince: "12 Jan 2026"
  };

  const activeBooking = {
    planName: "Premium Dedicated Desk",
    type: "FIXED",
    status: "CONFIRMED",
    startDate: "01 Jul 2026",
    endDate: "30 Jul 2026",
    seat: "Seat 12",
    access: "24 Hours / Day"
  };

  const bookingHistory = [
    { id: 1, planName: "Standard Flexible Seat", type: "FLEXIBLE", status: "COMPLETED", date: "Jun 2026" },
    { id: 2, planName: "Standard Flexible Seat", type: "FLEXIBLE", status: "COMPLETED", date: "May 2026" }
  ];

  return (
    <div className="min-h-screen bg-[#F7F9FA] font-sans selection:bg-primary/20 pb-32">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200/50 px-8 py-5 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/design-sample/overview" className="p-2.5 hover:bg-slate-100/80 rounded-full transition-colors group">
              <ArrowLeft className="w-5 h-5 text-slate-500 group-hover:text-slate-900 transition-colors" />
            </Link>
            <h1 className="text-[17px] font-bold text-slate-900 tracking-tight">Student Profile</h1>
          </div>
          <div className="flex items-center gap-3">
             <button className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-full transition-all duration-300">
               Edit
             </button>
             <button className="px-5 py-2.5 bg-slate-900 text-white hover:bg-black text-sm font-bold rounded-full transition-all duration-300 shadow-[0_4px_14px_0_rgb(0,0,0,0.15)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.23)] hover:-translate-y-0.5">
               Renew Plan
             </button>
             <button className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full transition-colors ml-1">
               <MoreHorizontal className="w-5 h-5" />
             </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 mt-8 space-y-8">
        
        {/* Top Profile Card - Meta Style Cover */}
        <div className="bg-white rounded-[3rem] border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden group">
          {/* Cover Photo / Mesh Gradient */}
          <div className="h-48 w-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 relative overflow-hidden">
            <div className="absolute inset-0 bg-black/10 mix-blend-overlay"></div>
            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-white/20 blur-3xl rounded-full"></div>
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-soft-light"></div>
          </div>
          
          <div className="px-10 pb-10 relative">
             {/* Floating Avatar */}
             <div className="absolute -top-20 left-10 p-2 bg-white rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
               <div className="relative">
                 <img src={student.pfp} alt={student.name} className="w-32 h-32 rounded-full object-cover" />
                 {student.isVerified && (
                   <div className="absolute bottom-1 right-1 bg-[#0085FF] text-white p-1.5 rounded-full border-[3px] border-white shadow-sm" title="Verified">
                     <CheckCircle2 className="w-5 h-5" />
                   </div>
                 )}
               </div>
             </div>
             
             {/* Profile Info */}
             <div className="pt-16 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                   <h2 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                     {student.name}
                   </h2>
                   <div className="flex items-center gap-3 mt-2 text-[15px]">
                     <span className="font-bold text-slate-500">{student.uniqueId}</span>
                     <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                     <span className="text-slate-500 font-medium">Joined {student.memberSince}</span>
                   </div>
                </div>
                
                {/* Quick Contact Badges */}
                <div className="flex flex-wrap items-center gap-3">
                   <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors cursor-pointer">
                     <Mail className="w-4 h-4 text-slate-400" />
                     <span className="font-bold text-[13px] text-slate-700">{student.email}</span>
                   </div>
                   <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors cursor-pointer">
                     <Phone className="w-4 h-4 text-slate-400" />
                     <span className="font-bold text-[13px] text-slate-700">{student.phone}</span>
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* Two Column Bento Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           
           {/* Left Column: Personal Info */}
           <div className="lg:col-span-1 space-y-8">
              <div className="bg-white p-8 rounded-[3rem] border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <h3 className="text-lg font-black text-slate-900 tracking-tight mb-8">About</h3>
                
                <div className="space-y-6">
                  <div className="flex gap-4 items-start group">
                    <div className="p-3 bg-slate-50 rounded-[1.2rem] text-slate-400 group-hover:bg-slate-100 group-hover:text-slate-600 transition-all"><Calendar className="w-5 h-5" /></div>
                    <div className="pt-1">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Date of Birth</div>
                      <div className="text-[15px] font-bold text-slate-900">{student.dob}</div>
                    </div>
                  </div>
                  <div className="flex gap-4 items-start group">
                    <div className="p-3 bg-slate-50 rounded-[1.2rem] text-slate-400 group-hover:bg-slate-100 group-hover:text-slate-600 transition-all"><User className="w-5 h-5" /></div>
                    <div className="pt-1">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Gender</div>
                      <div className="text-[15px] font-bold text-slate-900">{student.gender}</div>
                    </div>
                  </div>
                  <div className="flex gap-4 items-start group">
                    <div className="p-3 bg-slate-50 rounded-[1.2rem] text-slate-400 group-hover:bg-slate-100 group-hover:text-slate-600 transition-all"><MapPin className="w-5 h-5" /></div>
                    <div className="pt-1">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Verified Address</div>
                      <div className="text-[15px] font-bold text-slate-900 leading-relaxed pr-4">{student.address}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Digital Identity Card (Meta/Apple style) */}
              <div className="relative overflow-hidden bg-slate-900 p-8 rounded-[3rem] shadow-[0_8px_30px_rgb(0,0,0,0.12)] text-white group cursor-pointer">
                <div className="absolute -right-10 -top-10 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl pointer-events-none group-hover:bg-blue-500/30 transition-colors duration-700" />
                <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none group-hover:bg-emerald-500/30 transition-colors duration-700" />
                
                <div className="relative z-10">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-md border border-white/10">
                    <ShieldCheck className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-2 tracking-tight">Identity Verified</h3>
                  <p className="text-sm text-slate-300 font-medium mb-8 leading-relaxed">
                    Identity securely verified through official Digilocker integration.
                  </p>
                  <button className="w-full py-3.5 bg-white text-slate-900 hover:bg-slate-100 transition-colors rounded-2xl text-[13px] font-bold flex items-center justify-center gap-2 shadow-[0_2px_10px_rgba(255,255,255,0.1)]">
                    <Download className="w-4 h-4" /> Download KYC Report
                  </button>
                </div>
              </div>
           </div>

           {/* Right Column: Bookings & Activity */}
           <div className="lg:col-span-2 space-y-8">
              
              {/* Active Plan (Premium Glassmorphism + Accent) */}
              <div className="bg-white rounded-[3rem] border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden relative group">
                <div className="absolute top-0 w-full h-1.5 bg-[#0085FF]" />
                <div className="p-8 md:p-10">
                  <div className="flex flex-col md:flex-row justify-between items-start mb-10 gap-4">
                    <div>
                      <span className="text-[11px] font-black px-3 py-1.5 rounded-full mb-4 inline-flex items-center gap-1.5 bg-[#0085FF]/10 text-[#0085FF] tracking-widest uppercase">
                        <Activity className="w-3.5 h-3.5" /> {activeBooking.type} PLAN
                      </span>
                      <h3 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">{activeBooking.planName}</h3>
                    </div>
                    <span className="text-[11px] font-black px-4 py-2 rounded-xl uppercase tracking-widest bg-emerald-100 text-emerald-700 shadow-sm">
                      {activeBooking.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-8 mb-10">
                     <div>
                       <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><CalendarClock className="w-4 h-4" /> Booked Dates</div>
                       <div className="text-[15px] font-bold text-slate-900">{activeBooking.startDate} &mdash; {activeBooking.endDate}</div>
                     </div>
                     <div>
                       <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><MapPin className="w-4 h-4" /> Assigned Seat</div>
                       <div className="text-[15px] font-bold text-slate-900">{activeBooking.seat}</div>
                     </div>
                     <div>
                       <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Clock className="w-4 h-4" /> Access Hours</div>
                       <div className="text-[15px] font-bold text-slate-900">{activeBooking.access}</div>
                     </div>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-8 border-t border-slate-100">
                     <button className="px-6 py-3 bg-slate-50 text-slate-700 text-sm font-bold rounded-2xl hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all duration-300">
                       Change Seat
                     </button>
                     <button className="px-6 py-3 bg-slate-50 text-slate-700 text-sm font-bold rounded-2xl hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all duration-300">
                       Pause Booking
                     </button>
                  </div>
                </div>
              </div>

              {/* Past History */}
              <div className="bg-white p-8 md:p-10 rounded-[3rem] border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2"><History className="w-5 h-5 text-slate-400" /> Booking History</h3>
                  <button className="text-sm font-bold text-[#0085FF] hover:underline">View All</button>
                </div>
                
                <div className="space-y-3">
                  {bookingHistory.map(history => (
                    <div key={history.id} className="flex items-center justify-between p-4 rounded-[1.5rem] hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all duration-300 cursor-pointer group">
                      <div className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-[1.2rem] bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-[#0085FF]/10 group-hover:text-[#0085FF] group-hover:scale-105 transition-all duration-300">
                          <CreditCard className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-[15px] font-bold text-slate-900 leading-tight mb-1 group-hover:text-[#0085FF] transition-colors">{history.planName}</div>
                          <div className="text-xs font-semibold text-slate-500">{history.date} &bull; {history.type}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-5">
                        <span className="text-[10px] font-black px-3 py-1.5 rounded-lg bg-slate-100 text-slate-500 uppercase tracking-wider">
                          {history.status}
                        </span>
                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-[#0085FF] group-hover:translate-x-1 transition-all duration-300" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

           </div>
        </div>
      </div>
    </div>
  );
}
