"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Clock } from "lucide-react";

// Initialize Supabase client for realtime subscriptions
// Make sure to add these to your .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const supabase = createClient(supabaseUrl, supabaseKey);

type LiveLog = {
  id: string;
  userId: string | null;
  libraryId: string;
  doorId: string;
  timestamp: string;
  status: string;
  reason?: string | null;
};

export function LiveEntryLogs({ libraryId }: { libraryId: string }) {
  const [recentLogs, setRecentLogs] = useState<LiveLog[]>([]);
  const [failureCounts, setFailureCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!supabaseUrl || !supabaseKey) {
      console.warn("Supabase Realtime not configured. Missing ENV vars.");
      return;
    }

    // Subscribe to INSERT events on the EntryLog table
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'EntryLog',
          filter: `libraryId=eq.${libraryId}`,
        },
        (payload) => {
          const newLog = payload.new as LiveLog;
          
          setRecentLogs((prev) => [newLog, ...prev].slice(0, 15)); // Keep last 15

          // Update failure counts for flagging
          if (newLog.userId) {
            setFailureCounts((prev) => {
              const currentCount = prev[newLog.userId!] || 0;
              if (newLog.status === "DENIED") {
                return { ...prev, [newLog.userId!]: currentCount + 1 };
              } else {
                return { ...prev, [newLog.userId!]: 0 }; // Reset on success
              }
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [libraryId]);

  return (
    <div className="bg-card rounded-2xl border border-border p-6 shadow-sm mt-6">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-primary animate-pulse" />
        <h2 className="font-bold text-foreground">Live Access Logs</h2>
      </div>

      {(!supabaseUrl || !supabaseKey) && (
        <div className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded-lg border border-yellow-200 mb-4">
          ⚠️ Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local. Realtime updates are disabled.
        </div>
      )}

      {recentLogs.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">Waiting for new door scans...</p>
      ) : (
        <ul className="space-y-3">
          {recentLogs.map((log) => {
            const isDenied = log.status === "DENIED";
            const consecutiveFailures = log.userId ? (failureCounts[log.userId] || 0) : 0;
            const showWarning = consecutiveFailures >= 3;

            return (
              <li key={log.id} className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-300 animate-in fade-in slide-in-from-top-2 ${isDenied ? 'bg-destructive/10 border-destructive/20' : 'bg-success/10 border-success/20'}`}>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground">
                      User: <span className="font-mono text-xs">{log.userId || "UNKNOWN"}</span>
                    </span>
                    {isDenied && (
                      <span className="text-[10px] uppercase font-black tracking-widest bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded">
                        Denied
                      </span>
                    )}
                    {showWarning && isDenied && (
                      <span className="text-[10px] uppercase font-black tracking-widest bg-warning text-warning-foreground px-1.5 py-0.5 rounded animate-pulse">
                        Continuous Failures ({consecutiveFailures})
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground mt-0.5">
                    Door: {log.doorId || "Main Gate"}
                    {isDenied && log.reason && ` • Reason: ${log.reason}`}
                  </span>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-md ${isDenied ? 'text-destructive' : 'text-success'}`}>
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
