'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [supabase] = useState(() => createClient(supabaseUrl, supabaseKey));

  useEffect(() => {
    if (!supabaseUrl || !supabaseKey) return;

    // Listen to changes on Booking table
    const bookingSubscription = supabase
      .channel('booking-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'Booking' },
        () => {
          // Trigger a silent re-fetch of server data
          router.refresh();
        }
      )
      .subscribe();

    // Listen to changes on EntryLog table
    const entryLogSubscription = supabase
      .channel('entrylog-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'EntryLog' },
        () => {
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(bookingSubscription);
      supabase.removeChannel(entryLogSubscription);
    };
  }, [supabase, router]);

  return <>{children}</>;
}
