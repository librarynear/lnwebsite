"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase-server";

export async function toggleLibraryVerification(id: string, currentStatus: string | null) {
  const newStatus = currentStatus === "verified" ? "unverified" : "verified";
  
  const { error } = await supabaseServer
    .from("library_branches")
    .update({ verification_status: newStatus })
    .eq("id", id);

  if (error) {
    console.error("Failed to toggle verification", error);
    return { ok: false };
  }

  // Use revalidate path to clear cache
  revalidatePath("/admin/libraries");
  revalidatePath("/delhi/libraries");
  
  return { ok: true, newStatus };
}
