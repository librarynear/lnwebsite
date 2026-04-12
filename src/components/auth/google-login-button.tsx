"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";

type GoogleLoginButtonProps = {
  next?: string;
  className?: string;
  children?: ReactNode;
};

export function GoogleLoginButton({
  next = "/profile",
  className,
  children,
}: GoogleLoginButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: {
          prompt: "select_account",
        },
      },
    });

    if (error) {
      console.error("Google login failed:", error.message);
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleLogin()}
      disabled={loading}
      className={className}
    >
      {children ?? (loading ? "Connecting..." : "Continue with Google")}
    </button>
  );
}
