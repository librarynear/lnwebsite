"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase-server";
import { requireApprovedStaff } from "@/lib/staff-access";

export async function updateLeadStatus(leadId: string, status: string) {
  await requireApprovedStaff(["admin", "sales"]);
  const { error } = await supabaseServer
    .from("leads")
    .update({ status })
    .eq("id", leadId);

  if (error) {
    console.error("Failed to update status", error);
    return { ok: false };
  }

  revalidatePath("/admin");
  return { ok: true };
}
