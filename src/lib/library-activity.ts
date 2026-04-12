import "server-only";

import { createClient } from "@/lib/supabase/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function getCurrentActorUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

export async function logLibraryActivity(input: {
  libraryBranchId: string;
  actionType: string;
  changedFields?: string[];
  verificationStatus?: string | null;
  notes?: string | null;
}) {
  const actorUserId = await getCurrentActorUserId();

  const { error } = await supabaseServer.from("library_activity_logs").insert({
    library_branch_id: input.libraryBranchId,
    actor_user_id: actorUserId,
    action_type: input.actionType,
    changed_fields: input.changedFields ?? [],
    verification_status: input.verificationStatus ?? null,
    notes: input.notes ?? null,
  });

  if (error) {
    console.error("Failed to log library activity:", error.message);
  }
}
