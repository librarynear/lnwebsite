"use client";

import { useTransition } from "react";
import { updateLeadStatus } from "./leads-actions";

export function LeadStatusSelect({ leadId, currentStatus }: { leadId: string, currentStatus: string | null }) {
  const [isPending, startTransition] = useTransition();

  const statuses = ["new", "contacted", "converted", "dead"];
  const val = currentStatus || "new";

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value;
    startTransition(async () => {
      await updateLeadStatus(leadId, newStatus);
    });
  }

  return (
    <select
      value={val}
      onChange={handleChange}
      disabled={isPending}
      className={`text-xs px-2 py-1 rounded-md border font-medium ${
        val === "new" ? "bg-blue-50 text-blue-700 border-blue-200" :
        val === "contacted" ? "bg-amber-50 text-amber-700 border-amber-200" :
        val === "converted" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
        "bg-gray-50 text-gray-700 border-gray-200"
      }`}
    >
      {statuses.map((s) => (
        <option key={s} value={s}>{s.toUpperCase()}</option>
      ))}
    </select>
  );
}
