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
  userId: string;
  libraryId: string;
  doorId: string;
  timestamp: string;
  userName?: string; // We'll hydrate this if needed
};

export function LiveEntryLogs({ libraryId }: { libraryId: string }) {
  const [recentLogs, setRecentLogs] = useState<LiveLog[]>([]);

  useEffect(() => {
    if (!supabaseUrl || !supabaseKey) {
      console.warn("Supabase Realtime not configured. Missing ENV vars.");
      return;
    }

    // Fetch initial logs (optional, or just wait for new ones)
    const fetchInitialLogs = async () => {
      // In a real app, you might fetch the last 5 logs from your Next.js API here
    };
    fetchInitialLogs();

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
          setRecentLogs((prev) => [newLog, ...prev].slice(0, 10)); // Keep last 10
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
          {recentLogs.map((log) => (
            <li key={log.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50 transition-all duration-300 animate-in fade-in slide-in-from-top-2">
              <div className="flex flex-col">
                <span className="font-medium text-sm text-foreground">
                  User ID: <span className="font-mono text-xs">{log.userId}</span>
                </span>
                <span className="text-xs text-muted-foreground">Door: {log.doorId || "Main Gate"}</span>
              </div>
              <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-1 rounded-md">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
