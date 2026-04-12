"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { persistSavedLibraries, syncSavedLibraries } from "@/app/auth/actions";
import { useSavedStore } from "@/store/use-saved-store";

function toKey(ids: string[]) {
  return [...ids].sort().join("|");
}

export function AuthSavedSync() {
  const [userId, setUserId] = useState<string | null>(null);
  const [synced, setSynced] = useState(false);
  const { hasHydrated, savedLibraryIds, replaceSavedLibraryIds } = useSavedStore();
  const lastSyncedKeyRef = useRef("");
  const currentKey = useMemo(() => toKey(savedLibraryIds), [savedLibraryIds]);

  useEffect(() => {
    const supabase = createClient();

    const bootstrap = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
    };

    void bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
      if (!session?.user) {
        setSynced(false);
        lastSyncedKeyRef.current = "";
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!hasHydrated || !userId || synced) {
      return;
    }

    let isActive = true;

    const mergeSavedLibraries = async () => {
      const mergedIds = await syncSavedLibraries(savedLibraryIds);
      if (!isActive) return;

      replaceSavedLibraryIds(mergedIds);
      lastSyncedKeyRef.current = toKey(mergedIds);
      setSynced(true);
    };

    void mergeSavedLibraries();

    return () => {
      isActive = false;
    };
  }, [hasHydrated, replaceSavedLibraryIds, savedLibraryIds, synced, userId]);

  useEffect(() => {
    if (!hasHydrated || !userId || !synced) {
      return;
    }

    if (currentKey === lastSyncedKeyRef.current) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void persistSavedLibraries(savedLibraryIds).then((normalizedIds) => {
        lastSyncedKeyRef.current = toKey(normalizedIds);
      });
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [currentKey, hasHydrated, savedLibraryIds, synced, userId]);

  return null;
}
