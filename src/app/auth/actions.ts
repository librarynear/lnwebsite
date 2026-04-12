"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function normalizeIds(ids: string[]) {
  return [...new Set(ids.filter(Boolean))];
}

export async function signOutUser() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
}

export async function syncSavedLibraries(localIds: string[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return normalizeIds(localIds);
  }

  const local = normalizeIds(localIds);
  const { data: existingRows, error: existingError } = await supabase
    .from("user_saved_libraries")
    .select("library_branch_id")
    .eq("user_id", user.id);

  if (existingError) {
    console.error("Failed to load saved libraries:", existingError.message);
    return local;
  }

  const remote = normalizeIds((existingRows ?? []).map((row) => row.library_branch_id));
  const merged = normalizeIds([...remote, ...local]);
  const missing = merged.filter((id) => !remote.includes(id));

  if (missing.length > 0) {
    const { error: insertError } = await supabase.from("user_saved_libraries").insert(
      missing.map((library_branch_id) => ({
        user_id: user.id,
        library_branch_id,
      })),
    );

    if (insertError) {
      console.error("Failed to merge saved libraries:", insertError.message);
    }
  }

  return merged;
}

export async function persistSavedLibraries(nextIds: string[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return normalizeIds(nextIds);
  }

  const desired = normalizeIds(nextIds);
  const { data: existingRows, error: existingError } = await supabase
    .from("user_saved_libraries")
    .select("library_branch_id")
    .eq("user_id", user.id);

  if (existingError) {
    console.error("Failed to load saved libraries for persist:", existingError.message);
    return desired;
  }

  const remote = normalizeIds((existingRows ?? []).map((row) => row.library_branch_id));
  const toInsert = desired.filter((id) => !remote.includes(id));
  const toDelete = remote.filter((id) => !desired.includes(id));

  if (toInsert.length > 0) {
    const { error: insertError } = await supabase.from("user_saved_libraries").insert(
      toInsert.map((library_branch_id) => ({
        user_id: user.id,
        library_branch_id,
      })),
    );

    if (insertError) {
      console.error("Failed to persist added saved libraries:", insertError.message);
    }
  }

  if (toDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from("user_saved_libraries")
      .delete()
      .eq("user_id", user.id)
      .in("library_branch_id", toDelete);

    if (deleteError) {
      console.error("Failed to persist removed saved libraries:", deleteError.message);
    }
  }

  return desired;
}
