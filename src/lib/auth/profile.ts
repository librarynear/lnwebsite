import "server-only";

import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { createClient } from "@/lib/supabase/server";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

function getUserMetadataValue(user: User, key: string) {
  const metadata = user.user_metadata ?? {};
  const identityData =
    Array.isArray(user.identities) && user.identities.length > 0
      ? user.identities[0]?.identity_data ?? {}
      : {};

  return metadata[key] ?? identityData[key] ?? null;
}

export function buildProfilePayload(user: User) {
  return {
    id: user.id,
    email: user.email ?? null,
    full_name:
      (getUserMetadataValue(user, "full_name") as string | null) ??
      (getUserMetadataValue(user, "name") as string | null) ??
      null,
    avatar_url:
      (getUserMetadataValue(user, "avatar_url") as string | null) ??
      (getUserMetadataValue(user, "picture") as string | null) ??
      null,
  };
}

export async function upsertProfileFromUser(user: User) {
  const supabase = await createClient();
  const payload = buildProfilePayload(user);

  const { error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "id" });

  if (error) {
    console.error("Failed to upsert user profile:", error.message);
  }
}

export const getCurrentViewer = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, profile: null as ProfileRow | null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return {
    user,
    profile,
  };
});
