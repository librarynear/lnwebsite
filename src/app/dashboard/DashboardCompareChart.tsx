"use client"

import { useState, useMemo } from "react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts"
import { Calendar, ArrowRightLeft, TrendingUp, TrendingDown } from "lucide-react"

export function DashboardCompareChart({ allBookings }: { allBookings: any[] }) {
  function getLocalDateString(date: Date) {
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
  }

  const now = new Date();
  const defaultStartA = getLocalDateString(new Date(now.getFullYear(), now.getMonth(), 1));
  const defaultEndA = getLocalDateString(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  
  const defaultStartB = getLocalDateString(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const defaultEndB = getLocalDateString(new Date(now.getFullYear(), now.getMonth(), 0));

  const [isComparing, setIsComparing] = useState(false);
  const [rangeA, setRangeA] = useState({ start: defaultStartA, end: defaultEndA });
  const [rangeB, setRangeB] = useState({ start: defaultStartB, end: defaultEndB });

  // Map to store the very first booking timestamp for each student
  const firstBookingMap = useMemo(() => {
    const map = new Map<string, number>();
    const sorted = [...allBookings].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    for (const b of sorted) {
      if (!map.has(b.studentId)) {
        map.set(b.studentId, new Date(b.createdAt).getTime());
      }
    }
    return map;
  }, [allBookings]);

  function getMetrics(startStr: string, endStr: string) {
    const start = new Date(startStr);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endStr);
    end.setHours(23, 59, 59, 999);

    const filtered = allBookings.filter(b => {
      const d = new Date(b.createdAt).getTime();
      return d >= start.getTime() && d <= end.getTime();
    });

    let newCount = 0;
    let renewCount = 0;
    let totalRevenue = 0;

    filtered.forEach(b => {
      const isNew = firstBookingMap.get(b.studentId) === new Date(b.createdAt).getTime();
      if (isNew) newCount++;
      else renewCount++;

      let price = b.plan?.price || 0;
      if (b.plan?.discount) price -= (price * b.plan.discount / 100);
      if (b.standaloneLocker) price += b.standaloneLocker.price;
      totalRevenue += price;
    });

    return { total: filtered.length, newCount, renewCount, totalRevenue };
  }

  const metricsA = getMetrics(rangeA.start, rangeA.end);
  const metricsB = isComparing ? getMetrics(rangeB.start, rangeB.end) : null;

  // Build daily chart data for Period A
  const dailyDataA = useMemo(() => {
    const data = [];
    const start = new Date(rangeA.start);
    start.setHours(0,0,0,0);
    const end = new Date(rangeA.end);
    end.setHours(23,59,59,999);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dayStart = new Date(d).getTime();
      const dayEnd = dayStart + 86399999;
      
      const dayBookings = allBookings.filter(b => {
        const time = new Date(b.createdAt).getTime();
        return time >= dayStart && time <= dayEnd;
      });

      let newC = 0;
      let renC = 0;
      dayBookings.forEach(b => {
        if (firstBookingMap.get(b.studentId) === new Date(b.createdAt).getTime()) newC++;
        else renC++;
      });

      data.push({
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        New: newC,
        Renewal: renC
      });
    }
    return data;
  }, [allBookings, rangeA, firstBookingMap]);

  // If comparing, we build a grouped comparison array instead of daily
  const compareData = isComparing ? [
    {
      name: "Total Bookings",
      PeriodA: metricsA.total,
      PeriodB: metricsB!.total,
    },
    {
      name: "New Admissions",
      PeriodA: metricsA.newCount,
      PeriodB: metricsB!.newCount,
    },
    {
      name: "Renewals",
      PeriodA: metricsA.renewCount,
      PeriodB: metricsB!.renewCount,
    }
  ] : [];

  return (
    <div className="bg-card rounded-2xl border border-border p-6 shadow-sm flex flex-col h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-heading font-bold text-foreground">Admissions & Renewals</h2>
          <p className="text-sm text-muted-foreground mt-1">Track growth and compare date ranges.</p>
        </div>
        
        <button 
          onClick={() => setIsComparing(!isComparing)}
          className={`px-4 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 border transition-all ${isComparing ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border text-foreground hover:bg-muted'}`}
        >
          <ArrowRightLeft className="w-4 h-4" /> 
          {isComparing ? "Cancel Compare" : "Compare"}
        </button>
      </div>

      <div className="flex flex-col xl:flex-row gap-6 mb-8">
        {/* Period A Config & Stats */}
        <div className={`flex-1 p-4 rounded-xl border ${isComparing ? 'border-primary/20 bg-primary/5' : 'border-border bg-background'}`}>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-3 h-3 rounded-full bg-primary"></span>
            <h3 className="font-bold text-sm">{isComparing ? 'Period A' : 'Selected Period'}</h3>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            <button onClick={() => setRangeA({ start: getLocalDateString(new Date()), end: getLocalDateString(new Date()) })} className="px-2.5 py-1 text-xs border border-border bg-background hover:bg-muted font-medium rounded-md transition-colors">Today</button>
            <button onClick={() => {
              const start = new Date(); start.setDate(start.getDate() - start.getDay());
              const end = new Date(start); end.setDate(end.getDate() + 6);
              setRangeA({ start: getLocalDateString(start), end: getLocalDateString(end) });
            }} className="px-2.5 py-1 text-xs border border-border bg-background hover:bg-muted font-medium rounded-md transition-colors">This Week</button>
            <button onClick={() => {
              const n = new Date();
              setRangeA({ start: getLocalDateString(new Date(n.getFullYear(), n.getMonth(), 1)), end: getLocalDateString(new Date(n.getFullYear(), n.getMonth() + 1, 0)) });
            }} className="px-2.5 py-1 text-xs border border-border bg-background hover:bg-muted font-medium rounded-md transition-colors">This Month</button>
            <div className="flex items-center gap-1 border border-border rounded-md px-2 bg-background flex-1 sm:flex-none">
              <Calendar className="w-3 h-3 text-muted-foreground" />
              <input 
                type="date" 
                value={rangeA.start} 
                onChange={e => setRangeA(p => ({ ...p, start: e.target.value }))}
                className="w-full text-xs bg-transparent outline-none py-1.5 cursor-pointer"
              />
              <span className="text-muted-foreground self-center text-xs">to</span>
              <input 
                type="date" 
                value={rangeA.end} 
                onChange={e => setRangeA(p => ({ ...p, end: e.target.value }))}
                className="w-full text-xs bg-transparent outline-none py-1.5 cursor-pointer"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-background rounded-lg p-3 border border-border">
              <p className="text-xs text-muted-foreground font-medium">New</p>
              <p className="text-xl font-bold text-foreground">{metricsA.newCount}</p>
            </div>
            <div className="bg-background rounded-lg p-3 border border-border">
              <p className="text-xs text-muted-foreground font-medium">Renewals</p>
              <p className="text-xl font-bold text-foreground">{metricsA.renewCount}</p>
            </div>
          </div>
          <div className="mt-2 bg-background rounded-lg p-3 border border-border">
            <p className="text-xs text-muted-foreground font-medium">Total Revenue</p>
            <p className="text-xl font-bold text-success">₹{metricsA.totalRevenue.toLocaleString()}</p>
          </div>
        </div>

        {/* Period B Config & Stats */}
        {isComparing && metricsB && (
          <div className="flex-1 p-4 rounded-xl border border-muted-foreground/20 bg-muted/10">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-3 h-3 rounded-full bg-muted-foreground"></span>
              <h3 className="font-bold text-sm">Period B</h3>
            </div>
            <div className="flex gap-2 mb-4">
              <input 
                type="date" 
                value={rangeB.start} 
                onChange={e => setRangeB(p => ({ ...p, start: e.target.value }))}
                className="w-full text-xs bg-background border border-border rounded-md px-2 py-1.5"
              />
              <span className="text-muted-foreground self-center">to</span>
              <input 
                type="date" 
                value={rangeB.end} 
                onChange={e => setRangeB(p => ({ ...p, end: e.target.value }))}
                className="w-full text-xs bg-background border border-border rounded-md px-2 py-1.5"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-background rounded-lg p-3 border border-border">
                <p className="text-xs text-muted-foreground font-medium">New</p>
                <p className="text-xl font-bold text-foreground">{metricsB.newCount}</p>
              </div>
              <div className="bg-background rounded-lg p-3 border border-border">
                <p className="text-xs text-muted-foreground font-medium">Renewals</p>
                <p className="text-xl font-bold text-foreground">{metricsB.renewCount}</p>
              </div>
            </div>
            <div className="mt-2 bg-background rounded-lg p-3 border border-border">
              <p className="text-xs text-muted-foreground font-medium">Total Revenue</p>
              <p className="text-xl font-bold text-foreground">₹{metricsB.totalRevenue.toLocaleString()}</p>
            </div>
          </div>
        )}
      </div>

      <div className="h-[250px] w-full mt-auto">
        <ResponsiveContainer width="100%" height="100%">
          {isComparing ? (
            <BarChart data={compareData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                cursor={{ fill: '#f1f5f9', opacity: 0.5 }}
                contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
              />
              <Legend verticalAlign="top" height={36} />
              <Bar dataKey="PeriodA" name="Period A" fill="#2781CA" radius={[4, 4, 0, 0]} />
              <Bar dataKey="PeriodB" name="Period B" fill="#64748b" radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : (
            <BarChart data={dailyDataA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} minTickGap={20} />
              <YAxis fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                cursor={{ fill: '#f1f5f9', opacity: 0.5 }}
                contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
              />
              <Legend verticalAlign="top" height={36} />
              <Bar dataKey="New" stackId="a" fill="#2781CA" radius={[0, 0, 4, 4]} />
              <Bar dataKey="Renewal" stackId="a" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  )
}
