"use server";

import { supabaseServer } from "@/lib/supabase-server";
import {
  getLibraryCacheTarget,
  revalidateLibraryContent,
} from "@/lib/revalidate-library-content";
import { getCurrentActorUserId, logLibraryActivity } from "@/lib/library-activity";

export async function setLibraryVerificationStatus(id: string, newStatus: "verified" | "unverified") {
  const actorUserId = await getCurrentActorUserId();
  
  const { error } = await supabaseServer
    .from("library_branches")
    .update({
      verification_status: newStatus,
      last_verification_updated_at: new Date().toISOString(),
      last_verification_updated_by: actorUserId,
    })
    .eq("id", id);

  if (error) {
    console.error("Failed to toggle verification", error);
    return { ok: false };
  }

  revalidateLibraryContent(await getLibraryCacheTarget(id));
  await logLibraryActivity({
    libraryBranchId: id,
    actionType: "verification_updated",
    verificationStatus: newStatus,
    changedFields: ["verification_status"],
  });

  return { ok: true, newStatus };
}
