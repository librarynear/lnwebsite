"use client";

import { useTransition } from "react";
import { setLibraryVerificationStatus } from "../libraries-actions";

export function VerificationStatusSelect({
  id,
  value,
}: {
  id: string;
  value: "verified" | "unverified";
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      defaultValue={value}
      disabled={isPending}
      onChange={(event) => {
        const nextValue = event.target.value as "verified" | "unverified";
        startTransition(async () => {
          await setLibraryVerificationStatus(id, nextValue);
        });
      }}
      className="rounded-md border border-border bg-white px-2 py-1 text-xs font-medium text-black disabled:opacity-60"
    >
      <option value="unverified">Not Verified</option>
      <option value="verified">Verified</option>
    </select>
  );
}
