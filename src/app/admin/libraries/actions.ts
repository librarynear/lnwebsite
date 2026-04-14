"use server";

import { supabaseServer } from "@/lib/supabase-server";
import type { TablesUpdate } from "@/types/supabase";
import { refreshLibraryProfileCompletenessScore } from "@/lib/library-profile-score-server";
import {
  getLibraryCacheTarget,
  revalidateLibraryContent,
} from "@/lib/revalidate-library-content";
import { getCurrentActorUserId, logLibraryActivity } from "@/lib/library-activity";
import { requireApprovedStaff } from "@/lib/staff-access";
import {
  buildLibraryFeePlanInsertRows,
  parsePlanDraftsJson,
} from "@/lib/library-plans";
import { extractCoordinatesFromMapLink } from "@/lib/maps-coordinates";

export async function updateLibraryBranch(id: string, formData: FormData) {
  const previousTarget = await getLibraryCacheTarget(id);
  const actorUserId = await getCurrentActorUserId();
  const mapLink = (formData.get("map_link") as string) || "";
  const extractedCoordinates = extractCoordinatesFromMapLink(mapLink);
  const latitude = formData.get("latitude")
    ? Number(formData.get("latitude"))
    : extractedCoordinates?.latitude ?? null;
  const longitude = formData.get("longitude")
    ? Number(formData.get("longitude"))
    : extractedCoordinates?.longitude ?? null;
  const amenityValues = formData.getAll("amenities");

  const payload = {
    display_name: formData.get("display_name") as string,
    locality: formData.get("locality") as string,
    city: formData.get("city") as string,
    district: formData.get("district") as string,
    pin_code: formData.get("pin_code") as string,
    full_address: formData.get("full_address") as string,
    nearest_metro: formData.get("nearest_metro") as string,
    nearest_metro_distance_km: formData.get("nearest_metro_distance_km") ? parseFloat(formData.get("nearest_metro_distance_km") as string) : null,
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null,
    opening_time: formData.get("opening_time") as string,
    closing_time: formData.get("closing_time") as string,
    phone_number: formData.get("phone_number") as string,
    description: formData.get("description") as string,
    amenities_text: amenityValues.length > 0
      ? amenityValues.map((value) => String(value).trim()).filter(Boolean).join(", ")
      : (formData.get("amenities_text") as string),
    map_link: formData.get("map_link") as string,
    whatsapp_number: formData.get("whatsapp_number") as string,
    total_seats: formData.get("total_seats") ? parseInt(formData.get("total_seats") as string, 10) : null,
  };

  const feePlans = parsePlanDraftsJson(formData.get("fee_plans_json") as string);

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
    const plansToInsert = buildLibraryFeePlanInsertRows(feePlans, id);
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

export async function deleteLibraryBranch(id: string) {
  await requireApprovedStaff(["admin"]);

  const previousTarget = await getLibraryCacheTarget(id);

  const { error } = await supabaseServer
    .from("library_branches")
    .update({
      is_active: false,
      last_admin_reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidateLibraryContent(previousTarget);
  await logLibraryActivity({
    libraryBranchId: id,
    actionType: "library_deleted",
    changedFields: ["is_active"],
  });

  return { success: true };
}
