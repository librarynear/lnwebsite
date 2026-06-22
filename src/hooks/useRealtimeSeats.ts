import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

let supabase: ReturnType<typeof createClient> | null = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

export function useRealtimeSeats(libraryId: string, initialOccupiedSeatIds: string[]) {
  const [occupiedSeatIds, setOccupiedSeatIds] = useState<string[]>(initialOccupiedSeatIds);

  useEffect(() => {
    // If the initial data changes (e.g. via SWR/React Query revalidation), sync it
    setOccupiedSeatIds(initialOccupiedSeatIds);
  }, [initialOccupiedSeatIds.join(",")]);

  useEffect(() => {
    if (!supabase || !libraryId) return;

    // Generate a unique channel name so multiple instances on the same page don't collide
    const uniqueChannelId = `seats-${libraryId}-${Math.random().toString(36).substring(7)}`;

    const channel = supabase
      .channel(uniqueChannelId)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'Booking',
          filter: `libraryId=eq.${libraryId}`,
        },
        (payload) => {
          const newRecord = payload.new as any;
          const oldRecord = payload.old as any;

          setOccupiedSeatIds((prev) => {
            let updated = new Set(prev);
            const now = new Date().getTime();

            // Helper to check if a booking record implies the seat is occupied
            const isOccupied = (record: any) => {
              if (!record || !record.seatId) return false;
              if (record.status !== 'CONFIRMED' && record.status !== 'COMPLETED') return false;
              const endTime = new Date(record.endTime).getTime();
              return endTime > now;
            };

            // If it's an UPDATE or DELETE, the old seat might have been released
            if (payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
              if (oldRecord?.seatId) {
                // We assume it's released unless the new record says otherwise
                updated.delete(oldRecord.seatId);
              }
            }

            // If it's an INSERT or UPDATE, check if the new seat is occupied
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              if (isOccupied(newRecord)) {
                updated.add(newRecord.seatId);
              }
            }

            return Array.from(updated);
          });
        }
      )
      .subscribe();

    return () => {
      supabase?.removeChannel(channel);
    };
  }, [libraryId]);

  return occupiedSeatIds;
}
