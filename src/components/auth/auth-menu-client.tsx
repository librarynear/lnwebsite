"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { UserMenu } from "@/components/auth/user-menu";
import { Skeleton } from "@/components/ui/skeleton";

export function AuthMenuClient() {
  const [userState, setUserState] = useState<{
    loading: boolean;
    user: any | null;
  }>({ loading: true, user: null });

  useEffect(() => {
    const supabase = createClient();

    async function fetchUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setUserState({ loading: false, user: null });
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      setUserState({
        loading: false,
        user: {
          name:
            profile?.full_name ??
            user.user_metadata?.full_name ??
            user.user_metadata?.name ??
            null,
          email: profile?.email ?? user.email ?? null,
          avatarUrl:
            profile?.avatar_url ??
            user.user_metadata?.avatar_url ??
            user.user_metadata?.picture ??
            null,
        },
      });
    }

    fetchUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setUserState({ loading: false, user: null });
      } else if (event === "SIGNED_IN") {
        fetchUser();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (userState.loading) {
    return <Skeleton className="h-9 w-9 rounded-full" />;
  }

  return <UserMenu user={userState.user} />;
}
