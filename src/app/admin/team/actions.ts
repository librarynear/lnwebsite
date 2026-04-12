"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";
import { getCurrentActorUserId } from "@/lib/library-activity";

export async function saveStaffAccess(formData: FormData): Promise<void> {
  const userId = formData.get("user_id") as string;
  const role = formData.get("role") as string;
  const isApproved = formData.get("is_approved") === "true";
  const actorUserId = await getCurrentActorUserId();

  if (!userId || !role) {
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

export async function assignLocality(formData: FormData): Promise<void> {
  const userId = formData.get("user_id") as string;
  const city = formData.get("city") as string;
  const locality = formData.get("locality") as string;
  const actorUserId = await getCurrentActorUserId();

  if (!userId || !city || !locality) {
    redirect(`/admin/team/${userId}`);
  }

  const { error } = await supabaseServer.from("sales_locality_assignments").insert({
    user_id: userId,
    city,
    locality,
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
