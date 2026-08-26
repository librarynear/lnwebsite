'use client';
import { useState } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';

export function CalendarPrototype() {
  const [selectedDay, setSelectedDay] = useState(26);

  // Dummy activity data matching the screenshot
  const activityMap: Record<number, number> = {
    11: 1, // light blue
  };

  // Calendar logic for August 2026
  // Starts on Saturday (August 1st 2026 is a Saturday)
  const startPadding = 6;
  const daysInMonth = 31;
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="bg-white rounded-[24px] p-6 shadow-[0_2px_12px_rgb(0,0,0,0.04)] border border-slate-100 font-sans w-full max-w-[340px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-black tracking-tight text-slate-900 font-serif">August</h2>
        <button className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 transition-colors text-slate-700 px-3 py-1.5 rounded-xl border border-slate-100 text-[13px] font-medium">
          August, 2026
          <CalendarIcon className="w-3.5 h-3.5 ml-1" />
        </button>
      </div>

      {/* Days of week */}
      <div className="grid grid-cols-7 gap-2 mb-3">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
          <div key={i} className="text-center text-[11px] font-bold text-slate-500 mb-1">
            {day}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-2 mb-8">
        {Array.from({ length: startPadding }).map((_, i) => (
          <div key={`pad-${i}`} className="aspect-square" />
        ))}
        {days.map((day) => {
          const activityLevel = activityMap[day] || 0;
          const isSelected = day === selectedDay;

          let bgClass = "bg-[#f8f9fa] text-slate-300"; // default empty (very light gray)
          
          if (activityLevel === 1) bgClass = "bg-[#b9d5ee] text-white"; // light blue
          if (activityLevel === 2) bgClass = "bg-[#7ba9df] text-white"; // medium blue
          if (activityLevel === 3) bgClass = "bg-[#4582c7] text-white"; // darker blue
          if (activityLevel === 4) bgClass = "bg-[#1860ad] text-white"; // darkest blue

          let borderClass = "border-2 border-transparent";
          if (isSelected) {
            bgClass = "bg-white text-slate-400";
            borderClass = "border-2 border-slate-400";
          }

          return (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`aspect-square rounded-xl flex items-center justify-center text-[13px] font-medium transition-all ${bgClass} ${borderClass}`}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between text-[11px] font-medium text-slate-500">
        <span>Less</span>
        <div className="flex gap-1.5">
          <div className="w-3.5 h-3.5 rounded-[4px] bg-[#f8f9fa]" />
          <div className="w-3.5 h-3.5 rounded-[4px] bg-[#b9d5ee]" />
          <div className="w-3.5 h-3.5 rounded-[4px] bg-[#7ba9df]" />
          <div className="w-3.5 h-3.5 rounded-[4px] bg-[#4582c7]" />
          <div className="w-3.5 h-3.5 rounded-[4px] bg-[#1860ad]" />
        </div>
        <span>More</span>
      </div>
    </div>
  );
}
