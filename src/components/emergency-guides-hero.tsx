"use client";

import { ShieldAlert, Users, Shield } from "lucide-react";
import { IntentLink } from "@/components/intent-link";

export function EmergencyGuidesHero() {
  return (
    <section className="bg-white border-b border-border/50 relative overflow-hidden">
      {/* Background patterns */}
      <div className="absolute inset-0 bg-slate-50/50 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-30 pointer-events-none" />

      <div className="container mx-auto px-6 py-12 md:px-10 md:py-16 relative z-10 flex flex-col justify-center">
        <div className="max-w-4xl mx-auto text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col md:flex-row items-center justify-center gap-4">
            <div className="inline-flex items-center justify-center p-3 bg-red-50 text-red-600 rounded-2xl shadow-sm border border-red-100">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-black">
              Emergency Response Guides
            </h1>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <IntentLink
              href="/guides/librarian-emergency"
              className="w-full sm:w-auto group relative inline-flex items-center justify-center gap-3 bg-slate-900 text-white px-8 py-4 rounded-xl font-semibold overflow-hidden transition-transform hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-slate-900/20"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-slate-800 to-slate-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <Shield className="w-5 h-5 relative z-10 text-indigo-400 group-hover:text-indigo-300 transition-colors" />
              <span className="relative z-10">Guide for Librarians</span>
            </IntentLink>
            
            <IntentLink
              href="/guides/student-emergency"
              className="w-full sm:w-auto group relative inline-flex items-center justify-center gap-3 bg-white text-slate-900 border-2 border-slate-200 px-8 py-4 rounded-xl font-semibold overflow-hidden transition-all hover:border-slate-900 hover:shadow-lg active:scale-[0.98]"
            >
              <Users className="w-5 h-5 text-emerald-600 group-hover:text-emerald-700 transition-colors" />
              <span>Guide for Students</span>
            </IntentLink>
          </div>
        </div>
      </div>
    </section>
  );
}
