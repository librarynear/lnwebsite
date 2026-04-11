"use server";

import { supabaseServer } from "@/lib/supabase-server";
import {
  getLibraryCacheTarget,
  revalidateLibraryContent,
} from "@/lib/revalidate-library-content";

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

  revalidateLibraryContent(await getLibraryCacheTarget(id));

  return { ok: true, newStatus };
}
