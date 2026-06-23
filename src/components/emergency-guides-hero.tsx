"use client";

import { useState } from "react";
import { ShieldAlert, Users, Flame, Stethoscope, Activity, Zap, Shield, ChevronLeft, AlertTriangle } from "lucide-react";

type Role = "librarian" | "student" | null;

export function EmergencyGuidesHero() {
  const [role, setRole] = useState<Role>(null);

  return (
    <section className="bg-white border-b border-border/50 relative overflow-hidden">
      {/* Background patterns */}
      <div className="absolute inset-0 bg-slate-50/50 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-30 pointer-events-none" />

      <div className="container mx-auto px-6 py-12 md:px-10 md:py-16 relative z-10 min-h-[400px] flex flex-col justify-center">
        {!role ? (
          <div className="max-w-3xl mx-auto text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="inline-flex items-center justify-center p-3 bg-red-50 text-red-600 rounded-2xl mb-2 shadow-sm border border-red-100">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-black">
              Emergency Response Guides
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Safety is our top priority. Select your role to view detailed, step-by-step procedures for handling various emergencies inside the library.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
              <button
                onClick={() => setRole("librarian")}
                className="w-full sm:w-auto group relative inline-flex items-center justify-center gap-3 bg-slate-900 text-white px-8 py-4 rounded-xl font-semibold overflow-hidden transition-transform hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-slate-900/20"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-slate-800 to-slate-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <Shield className="w-5 h-5 relative z-10 text-indigo-400 group-hover:text-indigo-300 transition-colors" />
                <span className="relative z-10">Guide for Librarians</span>
              </button>
              
              <button
                onClick={() => setRole("student")}
                className="w-full sm:w-auto group relative inline-flex items-center justify-center gap-3 bg-white text-slate-900 border-2 border-slate-200 px-8 py-4 rounded-xl font-semibold overflow-hidden transition-all hover:border-slate-900 hover:shadow-lg active:scale-[0.98]"
              >
                <Users className="w-5 h-5 text-emerald-600 group-hover:text-emerald-700 transition-colors" />
                <span>Guide for Students</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-right-8 duration-500 w-full">
            <button
              onClick={() => setRole(null)}
              className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-black transition-colors mb-8 bg-white border border-border px-4 py-2 rounded-full shadow-sm hover:shadow-md"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to selection
            </button>
            
            <div className="flex items-center gap-4 mb-10 border-b border-border/50 pb-8">
              <div className={`p-4 rounded-2xl shadow-sm border ${role === 'librarian' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                {role === 'librarian' ? <Shield className="w-8 h-8" /> : <Users className="w-8 h-8" />}
              </div>
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-black tracking-tight">
                  {role === 'librarian' ? 'Librarian Emergency Protocol' : 'Student Safety Guide'}
                </h2>
                <p className="text-muted-foreground mt-2 text-[15px] md:text-base">
                  {role === 'librarian' 
                    ? 'Official crisis management and response procedures for library staff.' 
                    : 'Essential safety instructions for students during library emergencies.'}
                </p>
              </div>
            </div>

            <div className="grid gap-6">
              {role === 'librarian' ? <LibrarianGuide /> : <StudentGuide />}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function GuideCard({ icon: Icon, title, content, colorClass }: any) {
  return (
    <div className="group bg-white border border-border/60 rounded-2xl p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-col md:flex-row gap-6 items-start">
        <div className={`p-4 rounded-2xl shrink-0 border ${colorClass}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-black mb-4">{title}</h3>
          <div className="text-muted-foreground text-[15px] leading-relaxed">
            {content}
          </div>
        </div>
      </div>
    </div>
  );
}

function LibrarianGuide() {
  return (
    <>
      <GuideCard 
        icon={Flame} 
        colorClass="bg-orange-50 text-orange-600 border-orange-100"
        title="Fire & Smoke Emergencies"
        content={
          <ul className="space-y-3 list-none p-0 m-0">
            <li className="flex gap-3"><div className="w-2 h-2 rounded-full bg-orange-400 mt-2 shrink-0 shadow-[0_0_8px_rgba(251,146,60,0.6)]"/><span><strong className="text-gray-900 font-semibold">Trigger Alarm:</strong> Immediately activate the nearest fire pull station and call emergency services (112).</span></li>
            <li className="flex gap-3"><div className="w-2 h-2 rounded-full bg-orange-400 mt-2 shrink-0 shadow-[0_0_8px_rgba(251,146,60,0.6)]"/><span><strong className="text-gray-900 font-semibold">Coordinate Evacuation:</strong> Direct students to the nearest emergency exits. Do a sweep of study areas, restrooms, and private carrels to ensure no one is left behind.</span></li>
            <li className="flex gap-3"><div className="w-2 h-2 rounded-full bg-orange-400 mt-2 shrink-0 shadow-[0_0_8px_rgba(251,146,60,0.6)]"/><span><strong className="text-gray-900 font-semibold">Grab Essentials:</strong> If safe, grab the library emergency kit and student sign-in roster before exiting.</span></li>
            <li className="flex gap-3"><div className="w-2 h-2 rounded-full bg-orange-400 mt-2 shrink-0 shadow-[0_0_8px_rgba(251,146,60,0.6)]"/><span><strong className="text-gray-900 font-semibold">Assembly Point:</strong> Do a headcount at the designated assembly point outside and liaise with the fire department upon their arrival.</span></li>
          </ul>
        }
      />
      <GuideCard 
        icon={Stethoscope} 
        colorClass="bg-blue-50 text-blue-600 border-blue-100"
        title="Medical Emergencies"
        content={
          <ul className="space-y-3 list-none p-0 m-0">
            <li className="flex gap-3"><div className="w-2 h-2 rounded-full bg-blue-400 mt-2 shrink-0 shadow-[0_0_8px_rgba(96,165,250,0.6)]"/><span><strong className="text-gray-900 font-semibold">Assess & Call:</strong> Check the victim's responsiveness. Immediately call 112 for severe injuries, unconsciousness, or breathing issues.</span></li>
            <li className="flex gap-3"><div className="w-2 h-2 rounded-full bg-blue-400 mt-2 shrink-0 shadow-[0_0_8px_rgba(96,165,250,0.6)]"/><span><strong className="text-gray-900 font-semibold">Provide Care:</strong> Retrieve the First-Aid kit and AED. Administer CPR or basic first aid only if you are certified.</span></li>
            <li className="flex gap-3"><div className="w-2 h-2 rounded-full bg-blue-400 mt-2 shrink-0 shadow-[0_0_8px_rgba(96,165,250,0.6)]"/><span><strong className="text-gray-900 font-semibold">Crowd Control:</strong> Instruct other students to step back to give the patient privacy and clear a path for emergency medical services (EMS).</span></li>
            <li className="flex gap-3"><div className="w-2 h-2 rounded-full bg-blue-400 mt-2 shrink-0 shadow-[0_0_8px_rgba(96,165,250,0.6)]"/><span><strong className="text-gray-900 font-semibold">Direct EMS:</strong> Send a designated student or staff member to the main entrance to guide paramedics directly to the scene.</span></li>
          </ul>
        }
      />
      <GuideCard 
        icon={Activity} 
        colorClass="bg-amber-50 text-amber-600 border-amber-100"
        title="Earthquakes"
        content={
          <ul className="space-y-3 list-none p-0 m-0">
            <li className="flex gap-3"><div className="w-2 h-2 rounded-full bg-amber-400 mt-2 shrink-0 shadow-[0_0_8px_rgba(251,191,36,0.6)]"/><span><strong className="text-gray-900 font-semibold">Immediate Action:</strong> Yell "Drop, Cover, and Hold On!" to alert students. Take cover yourself under a sturdy desk or table.</span></li>
            <li className="flex gap-3"><div className="w-2 h-2 rounded-full bg-amber-400 mt-2 shrink-0 shadow-[0_0_8px_rgba(251,191,36,0.6)]"/><span><strong className="text-gray-900 font-semibold">Post-Shaking Check:</strong> Once shaking stops entirely, systematically check the library for structural damage, fallen bookshelves, and injured students.</span></li>
            <li className="flex gap-3"><div className="w-2 h-2 rounded-full bg-amber-400 mt-2 shrink-0 shadow-[0_0_8px_rgba(251,191,36,0.6)]"/><span><strong className="text-gray-900 font-semibold">Evacuate Safely:</strong> If the building is compromised or there are gas leaks, initiate a calm evacuation using the stairs. Do not use elevators.</span></li>
          </ul>
        }
      />
      <GuideCard 
        icon={AlertTriangle} 
        colorClass="bg-red-50 text-red-600 border-red-100"
        title="Unruly Behavior & Security Threats"
        content={
          <ul className="space-y-3 list-none p-0 m-0">
            <li className="flex gap-3"><div className="w-2 h-2 rounded-full bg-red-400 mt-2 shrink-0 shadow-[0_0_8px_rgba(248,113,113,0.6)]"/><span><strong className="text-gray-900 font-semibold">De-escalate:</strong> Maintain a calm, professional demeanor. Ask the disruptive individual to step outside to discuss the issue.</span></li>
            <li className="flex gap-3"><div className="w-2 h-2 rounded-full bg-red-400 mt-2 shrink-0 shadow-[0_0_8px_rgba(248,113,113,0.6)]"/><span><strong className="text-gray-900 font-semibold">Contact Authorities:</strong> If the individual becomes violent or refuses to leave, do not physically engage. Retreat and call library security or local police (112).</span></li>
            <li className="flex gap-3"><div className="w-2 h-2 rounded-full bg-red-400 mt-2 shrink-0 shadow-[0_0_8px_rgba(248,113,113,0.6)]"/><span><strong className="text-gray-900 font-semibold">Protect Students:</strong> Move bystanders away from the altercation. Initiate a lockdown procedure if a weapon is involved or an active threat is present.</span></li>
          </ul>
        }
      />
      <GuideCard 
        icon={Zap} 
        colorClass="bg-yellow-50 text-yellow-600 border-yellow-100"
        title="Power Outages"
        content={
          <ul className="space-y-3 list-none p-0 m-0">
            <li className="flex gap-3"><div className="w-2 h-2 rounded-full bg-yellow-400 mt-2 shrink-0 shadow-[0_0_8px_rgba(250,204,21,0.6)]"/><span><strong className="text-gray-900 font-semibold">Stay Calm:</strong> Announce that it is a power failure and instruct students to remain seated while emergency lighting kicks in.</span></li>
            <li className="flex gap-3"><div className="w-2 h-2 rounded-full bg-yellow-400 mt-2 shrink-0 shadow-[0_0_8px_rgba(250,204,21,0.6)]"/><span><strong className="text-gray-900 font-semibold">Assess & Inform:</strong> Contact building management to determine the expected duration. Distribute flashlights from the emergency kit.</span></li>
            <li className="flex gap-3"><div className="w-2 h-2 rounded-full bg-yellow-400 mt-2 shrink-0 shadow-[0_0_8px_rgba(250,204,21,0.6)]"/><span><strong className="text-gray-900 font-semibold">Evacuation Protocol:</strong> If power is out for more than 30 minutes, or if life safety systems (like fire alarms) are disabled, execute an orderly evacuation and close the library temporarily.</span></li>
          </ul>
        }
      />
    </>
  );
}

function StudentGuide() {
  return (
    <>
      <GuideCard 
        icon={Flame} 
        colorClass="bg-orange-50 text-orange-600 border-orange-100"
        title="Fire Evacuation"
        content={
          <ul className="space-y-3 list-none p-0 m-0">
            <li className="flex gap-3"><div className="w-2 h-2 rounded-full bg-orange-400 mt-2 shrink-0 shadow-[0_0_8px_rgba(251,146,60,0.6)]"/><span><strong className="text-gray-900 font-semibold">Leave Belongings:</strong> Do not waste time packing laptops, bags, or books. Your life is more important than belongings.</span></li>
            <li className="flex gap-3"><div className="w-2 h-2 rounded-full bg-orange-400 mt-2 shrink-0 shadow-[0_0_8px_rgba(251,146,60,0.6)]"/><span><strong className="text-gray-900 font-semibold">Follow Exit Signs:</strong> Move quickly and calmly to the nearest illuminated emergency exit. Never use the elevator during a fire alarm.</span></li>
            <li className="flex gap-3"><div className="w-2 h-2 rounded-full bg-orange-400 mt-2 shrink-0 shadow-[0_0_8px_rgba(251,146,60,0.6)]"/><span><strong className="text-gray-900 font-semibold">Stay Low:</strong> If the room or hallway is filling with smoke, drop to your hands and knees and crawl to the exit. Smoke rises and cleaner air is near the floor.</span></li>
          </ul>
        }
      />
      <GuideCard 
        icon={Stethoscope} 
        colorClass="bg-blue-50 text-blue-600 border-blue-100"
        title="Medical Emergencies"
        content={
          <ul className="space-y-3 list-none p-0 m-0">
            <li className="flex gap-3"><div className="w-2 h-2 rounded-full bg-blue-400 mt-2 shrink-0 shadow-[0_0_8px_rgba(96,165,250,0.6)]"/><span><strong className="text-gray-900 font-semibold">Alert Staff:</strong> Immediately notify the librarian or front desk staff about the situation.</span></li>
            <li className="flex gap-3"><div className="w-2 h-2 rounded-full bg-blue-400 mt-2 shrink-0 shadow-[0_0_8px_rgba(96,165,250,0.6)]"/><span><strong className="text-gray-900 font-semibold">Call 112:</strong> If the librarian is unavailable or it's a severe emergency, call emergency services yourself and provide the exact floor and room number.</span></li>
            <li className="flex gap-3"><div className="w-2 h-2 rounded-full bg-blue-400 mt-2 shrink-0 shadow-[0_0_8px_rgba(96,165,250,0.6)]"/><span><strong className="text-gray-900 font-semibold">Clear the Area:</strong> Give the affected person plenty of space to breathe. Do not attempt to move them unless they are in immediate danger.</span></li>
          </ul>
        }
      />
      <GuideCard 
        icon={Activity} 
        colorClass="bg-amber-50 text-amber-600 border-amber-100"
        title="Earthquake Protocol"
        content={
          <ul className="space-y-3 list-none p-0 m-0">
            <li className="flex gap-3"><div className="w-2 h-2 rounded-full bg-amber-400 mt-2 shrink-0 shadow-[0_0_8px_rgba(251,191,36,0.6)]"/><span><strong className="text-gray-900 font-semibold">Drop, Cover, Hold On:</strong> Drop to the floor, take cover under a sturdy study table or desk, and hold onto its legs to prevent it from shifting.</span></li>
            <li className="flex gap-3"><div className="w-2 h-2 rounded-full bg-amber-400 mt-2 shrink-0 shadow-[0_0_8px_rgba(251,191,36,0.6)]"/><span><strong className="text-gray-900 font-semibold">Avoid Hazards:</strong> Stay far away from windows, tall unsecured bookshelves, and overhead light fixtures which may shatter or fall.</span></li>
            <li className="flex gap-3"><div className="w-2 h-2 rounded-full bg-amber-400 mt-2 shrink-0 shadow-[0_0_8px_rgba(251,191,36,0.6)]"/><span><strong className="text-gray-900 font-semibold">Wait for Clearance:</strong> Do not evacuate while the building is actively shaking. Wait for instructions from the librarian once the tremor stops completely.</span></li>
          </ul>
        }
      />
      <GuideCard 
        icon={AlertTriangle} 
        colorClass="bg-red-50 text-red-600 border-red-100"
        title="Security Incidents"
        content={
          <ul className="space-y-3 list-none p-0 m-0">
            <li className="flex gap-3"><div className="w-2 h-2 rounded-full bg-red-400 mt-2 shrink-0 shadow-[0_0_8px_rgba(248,113,113,0.6)]"/><span><strong className="text-gray-900 font-semibold">Do Not Engage:</strong> If you witness a physical altercation or aggressive behavior, do not try to intervene or record the incident closely.</span></li>
            <li className="flex gap-3"><div className="w-2 h-2 rounded-full bg-red-400 mt-2 shrink-0 shadow-[0_0_8px_rgba(248,113,113,0.6)]"/><span><strong className="text-gray-900 font-semibold">Report:</strong> Quietly leave the immediate area and inform the library staff or call campus security.</span></li>
            <li className="flex gap-3"><div className="w-2 h-2 rounded-full bg-red-400 mt-2 shrink-0 shadow-[0_0_8px_rgba(248,113,113,0.6)]"/><span><strong className="text-gray-900 font-semibold">Lockdown:</strong> If an active threat is announced, follow lockdown procedures: hide out of sight, silence your phone, turn off screens, and barricade doors if possible.</span></li>
          </ul>
        }
      />
    </>
  );
}
