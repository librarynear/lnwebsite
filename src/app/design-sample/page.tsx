import React from "react";
import { Check, Star, Zap, Clock } from "lucide-react";

const mockPlans = [
  {
    id: "plan-1",
    name: "Reserve Seat - 12 Months - Full Day",
    price: 14400,
    discount: 30,
    validityDays: 360,
    durationHours: null,
  },
  {
    id: "plan-2",
    name: "12 Hrs Daily - 12 Months - 12hr",
    price: 12000,
    discount: 30,
    validityDays: 360,
    durationHours: 12,
  },
  {
    id: "plan-3",
    name: "Reserve Seat - 1 Month - Full Day",
    price: 1500,
    discount: 0,
    validityDays: 30,
    durationHours: null,
  }
];

export default function DesignSamplePage() {
  return (
    <div className="min-h-screen bg-muted/30 p-8">
      <div className="max-w-2xl mx-auto space-y-12">
        <header className="mb-8">
          <h1 className="text-3xl font-black text-foreground tracking-tight">Plan Card Redesign</h1>
          <p className="text-muted-foreground mt-2">A comparison between the current layout and the proposed "Flight Ticket" layouts.</p>
        </header>

        {/* CURRENT DESIGN (Approximation) */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight border-b pb-2">1. Current Design</h2>
          <div className="space-y-3">
            {mockPlans.map((plan) => {
              const finalPrice = plan.discount ? plan.price - (plan.price * plan.discount / 100) : plan.price;
              const months = Math.max(1, Math.round(plan.validityDays / 30));
              const perMonth = (finalPrice / months).toFixed(0);

              return (
                <div key={`current-${plan.id}`} className="p-4 border-2 rounded-2xl cursor-pointer transition-all border-border hover:border-border/80 bg-background">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-foreground">{plan.name}</span>
                    <div className="flex items-center gap-2">
                      {plan.discount > 0 ? (
                        <span className="text-xs text-muted-foreground line-through">₹{plan.price.toFixed(0)}</span>
                      ) : null}
                      <span className="font-bold text-foreground">₹{finalPrice.toFixed(0)}</span>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">{plan.validityDays} Days • {plan.durationHours ? `${plan.durationHours} hr access` : 'Full Day access'} • ₹{perMonth}/mo</div>
                  {plan.discount > 0 ? (
                    <div className="mt-2 text-[10px] font-bold text-success bg-success/10 px-2 py-1 rounded w-max">
                      {plan.discount}% OFF
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>

        {/* PROPOSED DESIGN - FLIGHT TICKET */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight border-b pb-2">2. Proposed Design (Flight Ticket Grid)</h2>
          <div className="space-y-4">
            {mockPlans.map((plan) => {
              const finalPrice = plan.discount ? plan.price - (plan.price * plan.discount / 100) : plan.price;
              const months = Math.max(1, Math.round(plan.validityDays / 30));
              const perMonth = (finalPrice / months).toFixed(0);
              
              const isFullDay = plan.durationHours === null;

              return (
                <div key={`ticket-${plan.id}`} className="relative flex flex-col sm:flex-row bg-background rounded-2xl border-2 border-border/60 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer overflow-hidden group">
                  {/* Left Side: Main Info */}
                  <div className="flex-1 p-5 pr-8">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        {isFullDay ? <Star className="w-4 h-4 text-primary" /> : <Clock className="w-4 h-4 text-primary" />}
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-foreground leading-tight">
                          {months} Month{months > 1 ? 's' : ''}
                        </h3>
                        <p className="text-sm font-medium text-muted-foreground">
                          {isFullDay ? 'Full Day Access' : `${plan.durationHours} Hrs Daily Access`}
                        </p>
                      </div>
                    </div>
                    
                    <ul className="mt-4 space-y-1.5 text-xs font-medium text-muted-foreground ml-10">
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-success" /> {plan.validityDays} Days Validity
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-success" /> Reserve a Dedicated Seat
                      </li>
                    </ul>
                  </div>

                  {/* Divider */}
                  <div className="hidden sm:block border-l-2 border-dashed border-border/60 my-4"></div>
                  <div className="block sm:hidden border-t-2 border-dashed border-border/60 mx-4"></div>

                  {/* Right Side: Pricing & CTA */}
                  <div className="p-5 sm:w-[220px] bg-slate-50/50 flex flex-col justify-center relative">
                    {/* Discount Badge */}
                    {plan.discount > 0 && (
                      <div className="absolute top-4 right-4 bg-red-100 text-red-700 font-bold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-wider">
                        <Zap className="w-3 h-3 fill-current" /> {plan.discount}% OFF
                      </div>
                    )}
                    
                    <div className="mt-2">
                      <div className="flex items-end gap-1">
                        <span className="text-2xl font-black text-foreground tracking-tight">₹{perMonth}</span>
                        <span className="text-sm text-muted-foreground font-medium mb-1">/mo</span>
                      </div>
                      
                      <div className="mt-2 text-xs text-muted-foreground">
                        Billed once at <span className="font-bold text-foreground">₹{finalPrice.toFixed(0)}</span>
                        {plan.discount > 0 && (
                          <span className="line-through ml-1 opacity-70">₹{plan.price.toFixed(0)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* PROPOSED DESIGN 3 - COMPACT SAAS STYLE */}
        <section className="space-y-4 pt-4">
          <h2 className="text-xl font-bold tracking-tight border-b pb-2">3. Proposed Design (Compact SaaS Style)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {mockPlans.map((plan) => {
              const finalPrice = plan.discount ? plan.price - (plan.price * plan.discount / 100) : plan.price;
              const months = Math.max(1, Math.round(plan.validityDays / 30));
              const perMonth = (finalPrice / months).toFixed(0);
              
              const isFullDay = plan.durationHours === null;

              return (
                <div key={`saas-${plan.id}`} className="bg-background rounded-2xl border-2 border-border/60 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer p-5 flex flex-col relative group">
                  {plan.discount > 0 && (
                    <div className="absolute -top-3 -right-2 bg-foreground text-background font-bold text-[10px] px-2.5 py-1 rounded-full shadow-sm uppercase tracking-widest">
                      Save {plan.discount}%
                    </div>
                  )}
                  
                  <div className="mb-4">
                    <h3 className="text-xl font-black text-foreground mb-1">{months} Month{months > 1 ? 's' : ''}</h3>
                    <p className="text-xs font-medium text-muted-foreground bg-muted w-max px-2 py-0.5 rounded-md">
                      {isFullDay ? 'Full Day Access' : `${plan.durationHours} Hrs Daily`}
                    </p>
                  </div>

                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-3xl font-black text-foreground tracking-tighter">₹{perMonth}</span>
                    <span className="text-sm text-muted-foreground font-medium">/mo</span>
                  </div>
                  
                  <div className="text-[11px] text-muted-foreground mb-4 pb-4 border-b border-dashed border-border/70">
                    Total ₹{finalPrice.toFixed(0)}
                    {plan.discount > 0 && (
                      <span className="line-through ml-1">₹{plan.price.toFixed(0)}</span>
                    )}
                  </div>

                  <ul className="space-y-2 text-xs font-medium text-foreground">
                    <li className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-success/15 flex items-center justify-center"><Check className="w-3 h-3 text-success" /></div>
                      {plan.validityDays} Days Validity
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-success/15 flex items-center justify-center"><Check className="w-3 h-3 text-success" /></div>
                      Reserve a Dedicated Seat
                    </li>
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        {/* PROPOSED DESIGN 4 - APPLE-STYLE MINIMALIST */}
        <section className="space-y-4 pt-4">
          <h2 className="text-xl font-bold tracking-tight border-b pb-2">4. Proposed Design (Apple-Style Minimalist)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {mockPlans.map((plan) => {
              const finalPrice = plan.discount ? plan.price - (plan.price * plan.discount / 100) : plan.price;
              const months = Math.max(1, Math.round(plan.validityDays / 30));
              const perMonth = (finalPrice / months).toFixed(0);
              const isFullDay = plan.durationHours === null;

              return (
                <div key={`apple-${plan.id}`} className="bg-gradient-to-b from-white to-slate-50/50 rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100/50 hover:shadow-lg transition-all duration-300 relative overflow-hidden group cursor-pointer">
                  {/* Subtle top gradient bar for visual interest */}
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-2">
                        {isFullDay ? 'All Day Pass' : `${plan.durationHours}-Hour Pass`}
                      </h3>
                      <div className="text-4xl font-semibold tracking-tight text-slate-900">
                        {months} <span className="text-2xl text-slate-400 font-medium">Months</span>
                      </div>
                    </div>
                    {plan.discount > 0 && (
                      <span className="bg-slate-900 text-white text-[11px] font-bold px-3 py-1 rounded-full tracking-wide shadow-sm">
                        Save {plan.discount}%
                      </span>
                    )}
                  </div>
                  
                  <div className="mt-8 mb-8">
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-semibold text-slate-900">₹</span>
                      <span className="text-5xl font-bold tracking-tighter text-slate-900">{perMonth}</span>
                      <span className="text-sm font-medium text-slate-500">/mo</span>
                    </div>
                    <div className="text-sm font-medium text-slate-400 mt-2">
                      Total ₹{finalPrice.toFixed(0)} billed upfront
                      {plan.discount > 0 && <span className="line-through ml-2 opacity-50">₹{plan.price.toFixed(0)}</span>}
                    </div>
                  </div>

                  <div className="space-y-3 pt-6 border-t border-slate-100">
                    <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
                      <Check className="w-4 h-4 text-slate-400" />
                      {plan.validityDays} Days of access
                    </div>
                    <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
                      <Check className="w-4 h-4 text-slate-400" />
                      Dedicated reserved seat
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* PROPOSED DESIGN 5 - SLEEK LIST ROW */}
        <section className="space-y-4 pt-4">
          <h2 className="text-xl font-bold tracking-tight border-b pb-2">5. Proposed Design (Sleek List Row)</h2>
          <div className="space-y-3">
            {mockPlans.map((plan) => {
              const finalPrice = plan.discount ? plan.price - (plan.price * plan.discount / 100) : plan.price;
              const months = Math.max(1, Math.round(plan.validityDays / 30));
              const perMonth = (finalPrice / months).toFixed(0);
              const isFullDay = plan.durationHours === null;

              return (
                <div key={`list-${plan.id}`} className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 hover:border-primary transition-colors cursor-pointer group shadow-sm">
                  <div className="flex items-center gap-4 mb-4 sm:mb-0">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                      {isFullDay ? <Star className="w-5 h-5 text-slate-400 group-hover:text-primary transition-colors" /> : <Clock className="w-5 h-5 text-slate-400 group-hover:text-primary transition-colors" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="text-base font-bold text-slate-900">{months} Months</h3>
                        {plan.discount > 0 && (
                          <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                            {plan.discount}% OFF
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-slate-500">
                        {isFullDay ? 'Full Day Access' : `${plan.durationHours} Hrs Daily`} • {plan.validityDays} Days
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between w-full sm:w-auto gap-6 sm:pl-6 sm:border-l border-slate-100">
                    <div className="text-left sm:text-right">
                      <div className="flex items-baseline sm:justify-end gap-1">
                        <span className="text-2xl font-bold text-slate-900 tracking-tight">₹{perMonth}</span>
                        <span className="text-xs font-medium text-slate-500">/mo</span>
                      </div>
                      <div className="text-[11px] font-medium text-slate-400 mt-0.5">
                        ₹{finalPrice.toFixed(0)} total
                      </div>
                    </div>
                    {/* Mock Radio Button to indicate selection */}
                    <div className="w-6 h-6 rounded-full border-2 border-slate-300 flex items-center justify-center group-hover:border-primary transition-colors shrink-0">
                      <div className="w-2.5 h-2.5 rounded-full bg-transparent group-hover:bg-primary transition-colors"></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* PROPOSED DESIGN 6 - THE FUSION (2 + 4 + 5, No Icons) */}
        <section className="space-y-4 pt-4 pb-20">
          <h2 className="text-xl font-bold tracking-tight border-b pb-2">6. Proposed Design (The Fusion: Ticket + Apple + Row, No Icons)</h2>
          <div className="space-y-4">
            {mockPlans.map((plan) => {
              const finalPrice = plan.discount ? plan.price - (plan.price * plan.discount / 100) : plan.price;
              const months = Math.max(1, Math.round(plan.validityDays / 30));
              const perMonth = (finalPrice / months).toFixed(0);
              const isFullDay = plan.durationHours === null;

              return (
                <div key={`fusion-${plan.id}`} className="flex flex-col sm:flex-row bg-white rounded-2xl border border-slate-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-slate-200 transition-all duration-300 cursor-pointer overflow-hidden group relative">
                  
                  {/* Subtle thin color line on left */}
                  <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${isFullDay ? 'bg-blue-500' : 'bg-slate-300'}`}></div>

                  {/* Left Side: Clean Typography */}
                  <div className="flex-1 p-5 sm:p-6 pl-6 sm:pl-8 flex flex-col justify-center relative">
                    {/* Subtle hover gradient */}
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    
                    <div className="relative z-10">
                      {/* Super Title for specific plan features like Reserved Seat */}
                      <div className={`text-[11px] font-bold uppercase tracking-widest mb-1.5 flex items-center gap-2 ${isFullDay ? 'text-blue-600' : 'text-slate-500'}`}>
                        {isFullDay ? 'Reserved Seat' : 'Flexible Hours'}
                        {plan.discount > 0 && (
                          <span className="bg-green-100 text-green-700 text-[9px] font-black px-2 py-0.5 rounded-sm tracking-widest uppercase">
                            {plan.discount}% OFF
                          </span>
                        )}
                      </div>
                      
                      <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-3 mb-2">
                        <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                          {months} Months
                        </h3>
                        <span className="text-lg font-medium text-slate-400 hidden sm:inline-block">/</span>
                        <span className="text-base sm:text-lg font-bold text-slate-700">
                          {isFullDay ? 'Full Day Access' : `${plan.durationHours} Hrs Daily`}
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3">
                        <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                          {plan.validityDays} Days Validity
                        </div>
                        <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                          {isFullDay ? 'Dedicated Desk' : 'Any Available Desk'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Divider (Ticket Style) */}
                  <div className="hidden sm:block border-l border-dashed border-slate-200 my-4"></div>
                  <div className="block sm:hidden border-t border-dashed border-slate-200 mx-5"></div>

                  {/* Right Side: Price Block */}
                  <div className="p-5 sm:p-6 sm:w-[240px] bg-slate-50/50 flex items-center justify-between sm:justify-end gap-6 relative z-10">
                    <div className="text-left sm:text-right">
                      <div className="flex items-baseline sm:justify-end gap-1 mb-1">
                        <span className="text-xl font-semibold text-slate-900">₹</span>
                        <span className="text-4xl font-bold tracking-tighter text-slate-900">{perMonth}</span>
                        <span className="text-sm font-medium text-slate-500">/mo</span>
                      </div>
                      <div className="text-[12px] font-medium text-slate-400">
                        Total ₹{finalPrice.toFixed(0)} 
                        {plan.discount > 0 && (
                          <span className="line-through ml-1.5 opacity-60">₹{plan.price.toFixed(0)}</span>
                        )}
                      </div>
                    </div>
                    
                    {/* Minimalist Selection Indicator (Apple-style radio) */}
                    <div className="w-5 h-5 rounded-full border-2 border-slate-300 flex items-center justify-center group-hover:border-primary transition-colors shrink-0">
                      <div className="w-2.5 h-2.5 rounded-full bg-transparent group-hover:bg-primary transition-colors"></div>
                    </div>
                  </div>
                  
                </div>
              );
            })}
          </div>
        </section>

        {/* PROPOSED DESIGN 8 - THE FUSION (Stacked text variation of 6) */}
        <section className="space-y-4 pt-4 pb-12">
          <h2 className="text-xl font-bold tracking-tight border-b pb-2">8. Proposed Design (Variation of 6: Stacked Text)</h2>
          <div className="space-y-4">
            {mockPlans.map((plan) => {
              const finalPrice = plan.discount ? plan.price - (plan.price * plan.discount / 100) : plan.price;
              const months = Math.max(1, Math.round(plan.validityDays / 30));
              const perMonth = (finalPrice / months).toFixed(0);
              const isFullDay = plan.durationHours === null;
              const isSelected = false; // Mock state

              return (
                <div key={`stacked-${plan.id}`} className="flex flex-row bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-400 active:scale-[0.99] active:bg-slate-50/50 transition-all duration-200 cursor-pointer overflow-hidden group relative">
                  
                  {/* Subtle thin color line on left */}
                  <div className={`absolute left-0 top-0 bottom-0 w-[4px] ${isFullDay ? 'bg-blue-500' : 'bg-slate-300'}`}></div>

                  {/* Left Side: Clean Typography */}
                  <div className="flex-1 py-4 pr-3 pl-5 flex flex-col justify-center relative min-w-0">
                    {/* Subtle hover gradient */}
                    <div className={`absolute inset-0 bg-gradient-to-r from-blue-50/[0.2] to-transparent transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}></div>
                    
                    <div className="relative z-10">
                      {/* Super Title */}
                      <div className={`text-[11px] font-bold mb-1.5 flex items-center gap-1.5 whitespace-nowrap ${isFullDay ? 'text-blue-600' : 'text-slate-500'}`}>
                        {isFullDay ? 'Reserved Seat' : 'Flexible Hours'}
                        {plan.discount > 0 && (
                          <span className="bg-blue-50 text-blue-600 border border-blue-200/60 text-[10px] font-black px-1.5 py-0.5 rounded-full tracking-wide">
                            {plan.discount}% OFF
                          </span>
                        )}
                      </div>
                      
                      {/* Stacked Title & Subtitle */}
                      <div className="mb-2">
                        <h3 className={`text-[22px] font-black tracking-tight leading-none transition-colors whitespace-nowrap ${isSelected ? 'text-blue-600' : 'text-slate-900 group-hover:text-blue-950'}`}>
                          {months} Month{months > 1 ? 's' : ''}
                        </h3>
                        <div className="text-[12px] font-medium text-slate-500 mt-1.5 whitespace-nowrap">
                          {isFullDay ? 'Full Day Access' : `${plan.durationHours} Hrs Daily`}
                        </div>
                      </div>
                      
                      {/* Details row */}
                      <div className="flex flex-row items-center gap-x-2 mt-2.5 overflow-hidden">
                        <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1 whitespace-nowrap">
                          <div className="w-1 h-1 rounded-full bg-slate-300 flex-shrink-0"></div>
                          {plan.validityDays} Days
                        </div>
                        <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1 whitespace-nowrap">
                          <div className="w-1 h-1 rounded-full bg-slate-300 flex-shrink-0"></div>
                          {isFullDay ? 'Dedicated Desk' : 'Any Desk'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Divider (Ticket Style) */}
                  <div className="border-l-[1.5px] border-dashed my-3 border-slate-200 group-hover:border-blue-200 transition-colors relative">
                    {/* Ticket notches */}
                    <div className="absolute -top-3 -left-1.5 w-3 h-3 bg-white border-b-[1.5px] border-r-[1.5px] border-transparent rounded-full"></div>
                    <div className="absolute -bottom-3 -left-1.5 w-3 h-3 bg-white border-t-[1.5px] border-r-[1.5px] border-transparent rounded-full"></div>
                  </div>

                  {/* Right Side: Price Block */}
                  <div className={`py-4 pr-5 pl-4 w-[135px] flex flex-col justify-center items-end relative z-10 transition-colors flex-shrink-0 ${isSelected ? 'bg-blue-50/50' : 'bg-slate-50/50 group-active:bg-slate-100/50'}`}>
                    <div className="text-right">
                      <div className="flex items-baseline justify-end gap-0.5 mb-1 whitespace-nowrap">
                        <span className={`text-[15px] font-bold ${isSelected ? 'text-blue-600' : 'text-slate-900'}`}>₹</span>
                        <span className={`text-[30px] font-black tracking-tighter ${isSelected ? 'text-blue-600' : 'text-slate-900'}`}>{perMonth}</span>
                        <span className="text-[11px] font-bold text-slate-500">/mo</span>
                      </div>
                      <div className="text-[11px] font-semibold text-slate-400 leading-tight whitespace-nowrap">
                        Total ₹{finalPrice.toFixed(0)} 
                        {plan.discount > 0 && (
                          <span className="line-through ml-1 opacity-60">₹{plan.price.toFixed(0)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                </div>
              );
            })}
          </div>
        </section>

        {/* PROPOSED DESIGN 7 - SEAT TYPE AS HERO + COLOR CODING */}
        <section className="space-y-4 pt-4 pb-20">
          <h2 className="text-xl font-bold tracking-tight border-b pb-2">7. Proposed Design (Seat Type as Hero + Color Coding)</h2>
          <p className="text-sm text-muted-foreground mb-4">This design makes it impossible to confuse the plan type. The seat type is the largest text, and we use a colored left-border (e.g., Blue for Reserved, Orange for Flexible) to instantly separate them visually.</p>
          <div className="space-y-4">
            {mockPlans.map((plan) => {
              const finalPrice = plan.discount ? plan.price - (plan.price * plan.discount / 100) : plan.price;
              const months = Math.max(1, Math.round(plan.validityDays / 30));
              const perMonth = (finalPrice / months).toFixed(0);
              const isReserved = plan.durationHours === null; // In this mock, full day = reserved

              return (
                <div key={`hero-${plan.id}`} className="flex flex-col sm:flex-row bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden group relative">
                  
                  {/* Color Coded Accent Line */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isReserved ? 'bg-blue-600' : 'bg-orange-500'}`}></div>

                  {/* Left Side: Seat Type is KING */}
                  <div className="flex-1 p-5 sm:p-6 pl-6 sm:pl-8 flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className={`text-2xl sm:text-3xl font-black tracking-tight ${isReserved ? 'text-blue-950' : 'text-orange-950'}`}>
                        {isReserved ? 'Reserved Seat' : 'Flexible Seat'}
                      </h3>
                      {plan.discount > 0 && (
                        <span className="bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                          {plan.discount}% OFF
                        </span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-x-2 text-base sm:text-lg font-bold text-slate-700 mt-1">
                      <span>{months} Month{months > 1 ? 's' : ''}</span>
                      <span className="text-slate-300">•</span>
                      <span>{isReserved ? 'Full Day Access' : `${plan.durationHours} Hours Daily`}</span>
                    </div>

                    <div className="flex items-center gap-4 mt-3">
                      <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${isReserved ? 'bg-blue-400' : 'bg-orange-400'}`}></div>
                        {plan.validityDays} Days Validity
                      </div>
                      <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${isReserved ? 'bg-blue-400' : 'bg-orange-400'}`}></div>
                        {isReserved ? 'Fixed Dedicated Desk' : 'Any Available Desk'}
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="hidden sm:block border-l border-dashed border-slate-200 my-4"></div>
                  <div className="block sm:hidden border-t border-dashed border-slate-200 mx-6"></div>

                  {/* Right Side: Price Block */}
                  <div className="p-5 sm:p-6 sm:w-[240px] bg-slate-50 flex items-center justify-between sm:justify-end gap-6">
                    <div className="text-left sm:text-right">
                      <div className="flex items-baseline sm:justify-end gap-1 mb-1">
                        <span className="text-xl font-semibold text-slate-900">₹</span>
                        <span className="text-4xl font-black tracking-tighter text-slate-900">{perMonth}</span>
                        <span className="text-sm font-medium text-slate-500">/mo</span>
                      </div>
                      <div className="text-[12px] font-medium text-slate-500">
                        Total ₹{finalPrice.toFixed(0)} 
                        {plan.discount > 0 && (
                          <span className="line-through ml-1.5 opacity-60">₹{plan.price.toFixed(0)}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="w-5 h-5 rounded-full border-2 border-slate-300 flex items-center justify-center group-hover:border-slate-800 transition-colors shrink-0">
                      <div className="w-2.5 h-2.5 rounded-full bg-transparent group-hover:bg-slate-800 transition-colors"></div>
                    </div>
                  </div>
                  
                </div>
              );
            })}
          </div>
        </section>

      </div>
    </div>
  );
}
