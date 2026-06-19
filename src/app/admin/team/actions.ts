"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";
import { getCurrentActorUserId } from "@/lib/library-activity";
import { requireApprovedStaff } from "@/lib/staff-access";

const VALID_STAFF_ROLES = ["admin", "sales"] as const;

function isValidStaffRole(role: string): role is (typeof VALID_STAFF_ROLES)[number] {
  return (VALID_STAFF_ROLES as readonly string[]).includes(role);
}

export async function saveStaffAccess(formData: FormData): Promise<void> {
  await requireApprovedStaff(["admin"]);
  const userId = formData.get("user_id") as string;
  const role = formData.get("role") as string;
  const isApproved = formData.get("is_approved") === "true";
  const actorUserId = await getCurrentActorUserId();

  if (!userId || !role || !isValidStaffRole(role)) {
    redirect("/admin/team");
  }

  const { error } = await supabaseServer.from("staff_users").upsert({
    user_id: userId,
    role,
    is_approved: isApproved,
    approved_by: isApproved ? actorUserId : null,
    approved_at: isApproved ? new Date().toISOString() : null,
  });

  if (error) {
    redirect("/admin/team");
  }

  revalidatePath("/admin/team");
  revalidatePath(`/admin/team/${userId}`);
  redirect(`/admin/team/${userId}`);
}

export async function addStaffByEmail(formData: FormData): Promise<void> {
  await requireApprovedStaff(["admin"]);
  const email = ((formData.get("email") as string) ?? "").trim().toLowerCase();
  const role = ((formData.get("role") as string) ?? "sales").trim();
  const isApproved = formData.get("is_approved") === "true";
  const actorUserId = await getCurrentActorUserId();

  if (!email || email.length > 320 || !role || !isValidStaffRole(role)) {
    redirect("/admin/team");
  }

  const { data: profile } = await supabaseServer
    .from("profiles")
    .select("id, email")
    .ilike("email", email)
    .maybeSingle();

  if (!profile?.id) {
    redirect("/admin/team");
  }

  const { error } = await supabaseServer.from("staff_users").upsert({
    user_id: profile.id,
    role,
    is_approved: isApproved,
    approved_by: isApproved ? actorUserId : null,
    approved_at: isApproved ? new Date().toISOString() : null,
  });

  if (error) {
    redirect("/admin/team");
  }

  revalidatePath("/admin/team");
  revalidatePath(`/admin/team/${profile.id}`);
  redirect(`/admin/team/${profile.id}`);
}

export async function assignLocality(formData: FormData): Promise<void> {
  await requireApprovedStaff(["admin"]);
  const userId = formData.get("user_id") as string;
  const localityId = formData.get("locality_id") as string;
  const actorUserId = await getCurrentActorUserId();

  if (!userId || !localityId) {
    redirect(`/admin/team/${userId}`);
  }

  const { data: locality } = await supabaseServer
    .from("localities")
    .select("id, city, name")
    .eq("id", localityId)
    .maybeSingle();

  if (!locality) {
    redirect(`/admin/team/${userId}`);
  }

  const { error } = await supabaseServer.from("sales_locality_assignments").insert({
    user_id: userId,
    locality_id: locality.id,
    city: locality.city,
    locality: locality.name,
    assigned_by: actorUserId,
  });

  if (error) {
    redirect(`/admin/team/${userId}`);
  }

  revalidatePath(`/admin/team/${userId}`);
  revalidatePath("/sales/libraries");
  redirect(`/admin/team/${userId}`);
}

export async function removeLocalityAssignment(formData: FormData): Promise<void> {
  await requireApprovedStaff(["admin"]);
  const assignmentId = formData.get("assignment_id") as string;
  const userId = formData.get("user_id") as string;

  if (!assignmentId) {
    redirect(`/admin/team/${userId}`);
  }

  const { error } = await supabaseServer
    .from("sales_locality_assignments")
    .delete()
    .eq("id", assignmentId);

  if (error) {
    redirect(`/admin/team/${userId}`);
  }

  revalidatePath(`/admin/team/${userId}`);
  revalidatePath("/sales/libraries");
  redirect(`/admin/team/${userId}`);
}
