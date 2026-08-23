'use client';

import { useMemo } from 'react';
import { 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  format, 
  isSameDay,
  isToday,
  isBefore,
  isAfter,
  addDays
} from 'date-fns';
import { Activity } from 'lucide-react';

type Log = {
  timestamp: Date;
  status: 'CHECK_IN' | 'CHECK_OUT';
};

export function FocusActivityCalendar({ logs }: { logs: Log[] }) {
  // Compute daily hours
  const dailyHours = useMemo(() => {
    const hoursMap = new Map<string, number>();
    
    // Group logs by day string (yyyy-MM-dd)
    const logsByDay = new Map<string, Log[]>();
    logs.forEach(log => {
      const dateStr = format(new Date(log.timestamp), 'yyyy-MM-dd');
      if (!logsByDay.has(dateStr)) {
        logsByDay.set(dateStr, []);
      }
      logsByDay.get(dateStr)!.push(log);
    });

    // Calculate duration for each day
    logsByDay.forEach((dayLogs, dateStr) => {
      let totalMs = 0;
      let lastCheckin: Date | null = null;
      
      // Sort logs chronologically for the day
      dayLogs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      dayLogs.forEach(log => {
        if (log.status === 'CHECK_IN') {
          lastCheckin = new Date(log.timestamp);
        } else if (log.status === 'CHECK_OUT' && lastCheckin) {
          totalMs += new Date(log.timestamp).getTime() - lastCheckin.getTime();
          lastCheckin = null;
        }
      });
      
      // If there's an unclosed checkin on the same day and it's not today, assume 2 hours
      // If it's today, calculate up to now
      if (lastCheckin) {
        const checkinDay = format(lastCheckin, 'yyyy-MM-dd');
        const todayDay = format(new Date(), 'yyyy-MM-dd');
        if (checkinDay === todayDay) {
          totalMs += new Date().getTime() - lastCheckin.getTime();
        } else {
          totalMs += 2 * 60 * 60 * 1000; // Assume 2 hours
        }
      }

      hoursMap.set(dateStr, totalMs / (1000 * 60 * 60)); // convert to hours
    });

    return hoursMap;
  }, [logs]);

  // Current month grid
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  
  // To match typical calendar layout, get days to pad the start
  const startPadding = monthStart.getDay(); // 0 is Sunday
  
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  const totalHoursThisMonth = useMemo(() => {
    let total = 0;
    daysInMonth.forEach(day => {
      total += dailyHours.get(format(day, 'yyyy-MM-dd')) || 0;
    });
    return Math.round(total);
  }, [dailyHours, daysInMonth]);

  const getHeatmapColor = (hours: number) => {
    if (hours === 0) return 'bg-[#1a1c23] text-muted-foreground/30';
    if (hours < 2) return 'bg-[#0f3d23] text-white/70';
    if (hours < 4) return 'bg-[#186a3b] text-white';
    if (hours < 6) return 'bg-[#27ae60] text-white font-bold';
    return 'bg-[#2ecc71] text-black font-bold';
  };

  return (
    <div className="bg-[#0f1115] rounded-3xl p-6 sm:p-8 w-full max-w-3xl border border-white/5 shadow-2xl mx-auto font-sans">
      <div className="flex justify-between items-start mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Activity className="w-6 h-6 text-[#2ecc71]" strokeWidth={2.5} />
            <h2 className="text-2xl font-bold text-white tracking-tight">Focus Activity</h2>
          </div>
          <p className="text-[#a0a5b1] text-base">{totalHoursThisMonth} total hours this month</p>
        </div>
        <div className="bg-[#1a1c23] rounded-xl px-4 py-2 flex items-center gap-4 border border-white/5">
          <button className="text-[#a0a5b1] hover:text-white transition-colors">&lt;</button>
          <span className="text-white font-medium text-sm w-28 text-center">{format(now, 'MMMM')} <span className="text-[#a0a5b1]">/ {format(now, 'yyyy')}</span></span>
          <button className="text-[#a0a5b1] hover:text-white transition-colors">&gt;</button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-3 sm:gap-4 mb-8">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-xs font-semibold text-[#a0a5b1] mb-2">{day}</div>
        ))}

        {/* Padding days */}
        {Array.from({ length: startPadding }).map((_, i) => {
          const prevDay = addDays(monthStart, -(startPadding - i));
          return (
            <div key={`pad-${i}`} className="aspect-square rounded-2xl bg-transparent flex items-center justify-center text-[#a0a5b1] opacity-20 text-sm font-medium">
              {format(prevDay, 'd')}
            </div>
          )
        })}

        {/* Month days */}
        {daysInMonth.map((day) => {
          const isFuture = isAfter(day, now) && !isSameDay(day, now);
          const hours = dailyHours.get(format(day, 'yyyy-MM-dd')) || 0;
          
          if (isFuture) {
            return (
              <div key={day.toISOString()} className="aspect-square rounded-2xl bg-[#1a1c23] opacity-30 flex items-center justify-center text-[#a0a5b1] text-sm font-medium transition-colors hover:bg-[#22252e]">
                {format(day, 'd')}
              </div>
            );
          }

          return (
            <div 
              key={day.toISOString()} 
              className={`aspect-square rounded-2xl flex items-center justify-center text-sm transition-all duration-300 hover:scale-[1.03] hover:ring-2 hover:ring-[#2ecc71]/50 cursor-default ${getHeatmapColor(hours)} ${isToday(day) ? 'ring-2 ring-white/20' : ''}`}
              title={`${Math.round(hours * 10) / 10} hours on ${format(day, 'MMM d')}`}
            >
              {format(day, 'd')}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-2 mt-4 text-xs font-medium text-[#a0a5b1] bg-[#1a1c23] w-fit mx-auto px-4 py-2 rounded-full border border-white/5">
        <span>Less</span>
        <div className="w-4 h-4 rounded-[4px] bg-[#1a1c23] border border-white/5" />
        <div className="w-4 h-4 rounded-[4px] bg-[#0f3d23]" />
        <div className="w-4 h-4 rounded-[4px] bg-[#186a3b]" />
        <div className="w-4 h-4 rounded-[4px] bg-[#27ae60]" />
        <div className="w-4 h-4 rounded-[4px] bg-[#2ecc71]" />
        <span>More</span>
      </div>
    </div>
  );
}
