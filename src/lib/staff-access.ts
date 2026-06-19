import "server-only";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";
import type { Tables } from "@/types/supabase";
import { getCurrentViewer, upsertProfileFromUser } from "@/lib/auth/profile";

export type StaffRole = "admin" | "sales";

type StaffUser = Tables<"staff_users">;
type Profile = Tables<"profiles">;

function getBootstrapAdminEmails() {
  return (process.env.ADMIN_BOOTSTRAP_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export async function getCurrentStaffContext() {
  const { user, profile } = await getCurrentViewer();

  if (!user) {
    return {
      user: null,
      staffUser: null as StaffUser | null,
      profile: null as Profile | null,
      bootstrapAdmin: false,
      bootstrapAdminAllowed: false,
    };
  }

  await upsertProfileFromUser(user);

  const [{ data: staffUser }, { count: approvedAdminCount }] = await Promise.all([
    supabaseServer.from("staff_users").select("*").eq("user_id", user.id).maybeSingle(),
    supabaseServer
      .from("staff_users")
      .select("user_id", { count: "exact", head: true })
      .eq("role", "admin")
      .eq("is_approved", true),
  ]);

  const bootstrapAdmin = (approvedAdminCount ?? 0) === 0;
  const userEmail = user.email?.toLowerCase() ?? "";
  const bootstrapAdminAllowed =
    bootstrapAdmin &&
    userEmail.length > 0 &&
    getBootstrapAdminEmails().includes(userEmail);

  return {
    user,
    staffUser: (staffUser as StaffUser | null) ?? null,
    profile: (profile as Profile | null) ?? null,
    bootstrapAdmin,
    bootstrapAdminAllowed,
  };
}

export async function requireApprovedStaff(allowedRoles: StaffRole[]) {
  const context = await getCurrentStaffContext();

  if (!context.user) {
    redirect("/staff-access");
  }

  if (context.bootstrapAdminAllowed && allowedRoles.includes("admin")) {
    return {
      ...context,
      effectiveRole: "admin" as StaffRole,
      isApproved: true,
    };
  }

  if (!context.staffUser?.is_approved || !allowedRoles.includes(context.staffUser.role as StaffRole)) {
    redirect("/staff-access");
  }

  return {
    ...context,
    effectiveRole: context.staffUser.role as StaffRole,
    isApproved: true,
  };
}

/**
 * Ensure the current staff user is allowed to mutate a specific library.
 * Admins may touch any library; sales users are restricted to libraries whose
 * locality_id is in their sales_locality_assignments. Prevents IDOR where a
 * sales account calls a server action with an arbitrary library UUID.
 */
export async function requireLibraryMutationAccess(libraryId: string) {
  const staff = await requireApprovedStaff(["admin", "sales"]);

  if (staff.effectiveRole === "admin") {
    return staff;
  }

  const { data: library } = await supabaseServer
    .from("library_branches")
    .select("locality_id")
    .eq("id", libraryId)
    .maybeSingle();

  const localityId = (library as { locality_id: string | null } | null)?.locality_id ?? null;
  if (!localityId) {
    redirect("/sales/libraries");
  }

  const { data: assignment } = await supabaseServer
    .from("sales_locality_assignments")
    .select("id")
    .eq("user_id", staff.user!.id)
    .eq("locality_id", localityId)
    .maybeSingle();

  if (!assignment) {
    redirect("/sales/libraries");
  }

  return staff;
}
