"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase-server";

export async function updateLeadStatus(leadId: string, status: string) {
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
