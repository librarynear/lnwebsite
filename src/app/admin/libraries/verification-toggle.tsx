"use client";

import { useTransition } from "react";
import { toggleLibraryVerification } from "../libraries-actions";

export function VerificationToggle({ id, isVerified }: { id: string, isVerified: boolean }) {
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      await toggleLibraryVerification(id, isVerified ? "verified" : "unverified");
    });
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
        isVerified
          ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
          : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
      } disabled:opacity-50`}
    >
      {isVerified ? "Verified" : "Unverified"}
    </button>
  );
}
