"use server";

import { supabaseServer } from "@/lib/supabase-server";
import type { TablesUpdate } from "@/types/supabase";
import { refreshLibraryProfileCompletenessScore } from "@/lib/library-profile-score-server";
import {
  getLibraryCacheTarget,
  revalidateLibraryContent,
} from "@/lib/revalidate-library-content";
import { getCurrentActorUserId, logLibraryActivity } from "@/lib/library-activity";

type FeePlanInput = {
  duration_label?: string | null;
  seat_type?: string | null;
  price?: string | number | null;
};

export async function updateLibraryBranch(id: string, formData: FormData) {
  const previousTarget = await getLibraryCacheTarget(id);
  const actorUserId = await getCurrentActorUserId();

  const payload = {
    display_name: formData.get("display_name") as string,
    locality: formData.get("locality") as string,
    city: formData.get("city") as string,
    district: formData.get("district") as string,
    pin_code: formData.get("pin_code") as string,
    full_address: formData.get("full_address") as string,
    nearest_metro: formData.get("nearest_metro") as string,
    nearest_metro_distance_km: formData.get("nearest_metro_distance_km") ? parseFloat(formData.get("nearest_metro_distance_km") as string) : null,
    opening_time: formData.get("opening_time") as string,
    closing_time: formData.get("closing_time") as string,
    phone_number: formData.get("phone_number") as string,
    description: formData.get("description") as string,
    amenities_text: formData.get("amenities_text") as string,
    map_link: formData.get("map_link") as string,
    whatsapp_number: formData.get("whatsapp_number") as string,
    total_seats: formData.get("total_seats") ? parseInt(formData.get("total_seats") as string, 10) : null,
  };

  const feePlansJson = formData.get("fee_plans_json") as string;
  let feePlans: FeePlanInput[] = [];
  if (feePlansJson) {
    try {
      const parsed = JSON.parse(feePlansJson) as unknown;
      feePlans = Array.isArray(parsed) ? (parsed as FeePlanInput[]) : [];
    } catch {
      console.warn("Invalid fee plans JSON");
    }
  }

  const cleanedPayload: TablesUpdate<"library_branches"> = Object.fromEntries(
    Object.entries(payload).map(([k, v]) => [k, v === "" ? null : v]),
  );

  cleanedPayload.last_sales_reviewed_at = new Date().toISOString();
  cleanedPayload.last_sales_reviewer_id = actorUserId;

  const { error } = await supabaseServer
    .from("library_branches")
    .update(cleanedPayload)
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  // Sync Fee Plans
  // 1. Delete existing plans
  await supabaseServer.from("library_fee_plans").delete().eq("library_branch_id", id);
  
  // 2. Insert new plans
  if (feePlans.length > 0) {
    const plansToInsert = feePlans.map((plan) => {
      const duration = plan.duration_label || "Monthly";
      const seat = plan.seat_type || "Unreserved";
      return {
        library_branch_id: id,
        duration_label: duration,
        plan_name: `${duration} - ${seat}`,
        price: plan.price ? parseFloat(String(plan.price)) : 0,
        seat_type: seat,
      };
    });
    await supabaseServer.from("library_fee_plans").insert(plansToInsert);
  }

  await refreshLibraryProfileCompletenessScore(id);

  const nextTarget = await getLibraryCacheTarget(id);
  revalidateLibraryContent(previousTarget);
  revalidateLibraryContent(nextTarget);
  await logLibraryActivity({
    libraryBranchId: id,
    actionType: "library_updated",
    changedFields: Object.keys(cleanedPayload),
  });

  return { success: true };
}
