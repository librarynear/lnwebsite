import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseServer } from "@/lib/supabase-server";
import type { Tables } from "@/types/supabase";
import { upsertProfileFromUser } from "@/lib/auth/profile";

export type StaffRole = "admin" | "sales";

type StaffUser = Tables<"staff_users">;
type Profile = Tables<"profiles">;

export async function getCurrentStaffContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, staffUser: null as StaffUser | null, profile: null as Profile | null, bootstrapAdmin: false };
  }

  await upsertProfileFromUser(user);

  const [{ data: staffUser }, { data: profile }, { count: approvedAdminCount }] = await Promise.all([
    supabaseServer.from("staff_users").select("*").eq("user_id", user.id).maybeSingle(),
    supabaseServer.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabaseServer
      .from("staff_users")
      .select("user_id", { count: "exact", head: true })
      .eq("role", "admin")
      .eq("is_approved", true),
  ]);

  const bootstrapAdmin = (approvedAdminCount ?? 0) === 0;

  return {
    user,
    staffUser: (staffUser as StaffUser | null) ?? null,
    profile: (profile as Profile | null) ?? null,
    bootstrapAdmin,
  };
}

export async function requireApprovedStaff(allowedRoles: StaffRole[]) {
  const context = await getCurrentStaffContext();

  if (!context.user) {
    redirect("/profile");
  }

  if (context.bootstrapAdmin && allowedRoles.includes("admin")) {
    return {
      ...context,
      effectiveRole: "admin" as StaffRole,
      isApproved: true,
    };
  }

  if (!context.staffUser?.is_approved || !allowedRoles.includes(context.staffUser.role as StaffRole)) {
    redirect("/profile");
  }

  return {
    ...context,
    effectiveRole: context.staffUser.role as StaffRole,
    isApproved: true,
  };
}
