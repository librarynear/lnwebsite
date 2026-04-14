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
import { findNearestMetro } from "@/lib/nearest-metro";
import {
  hasValidPlanDescriptions,
  hasValidTimeRange,
  isValidLatitude,
  isValidLongitude,
  isValidMapLink,
  isValidPinCode,
  normalizeIndianPhone,
} from "@/lib/owner-form-validation";

function getTrimmedString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function updateLibraryBranch(id: string, formData: FormData) {
  await requireApprovedStaff(["sales", "admin"]);

  const previousTarget = await getLibraryCacheTarget(id);
  const actorUserId = await getCurrentActorUserId();
  const displayName = getTrimmedString(formData, "display_name");
  const locality = getTrimmedString(formData, "locality");
  const city = getTrimmedString(formData, "city");
  const district = getTrimmedString(formData, "district") || null;
  const state = getTrimmedString(formData, "state");
  const pinCode = getTrimmedString(formData, "pin_code");
  const fullAddress = getTrimmedString(formData, "full_address");
  const openingTime = getTrimmedString(formData, "opening_time");
  const closingTime = getTrimmedString(formData, "closing_time");
  const mapLink = getTrimmedString(formData, "map_link");
  const description = getTrimmedString(formData, "description") || null;
  const phoneNumber = normalizeIndianPhone(getTrimmedString(formData, "phone_number"));
  const rawWhatsapp = getTrimmedString(formData, "whatsapp_number");
  const whatsappNumber = rawWhatsapp ? normalizeIndianPhone(rawWhatsapp) : null;
  const totalSeatsRaw = getTrimmedString(formData, "total_seats");
  const totalSeats = totalSeatsRaw ? Number.parseInt(totalSeatsRaw, 10) : Number.NaN;
  const amenityValues = formData
    .getAll("amenities")
    .map((value) => String(value).trim())
    .filter(Boolean);
  const rawPlansJson = getTrimmedString(formData, "fee_plans_json");
  const feePlans = parsePlanDraftsJson(rawPlansJson);
  const overrideNearestMetro = String(formData.get("override_nearest_metro") ?? "") === "on";

  if (
    !displayName ||
    !locality ||
    !city ||
    !state ||
    !pinCode ||
    !fullAddress ||
    !openingTime ||
    !closingTime ||
    !mapLink ||
    !phoneNumber ||
    !Number.isInteger(totalSeats) ||
    totalSeats < 1 ||
    amenityValues.length === 0
  ) {
    return { success: false, error: "Please fill all compulsory fields." };
  }

  if (rawWhatsapp && !whatsappNumber) {
    return { success: false, error: "Please enter a valid WhatsApp number." };
  }

  if (!isValidPinCode(pinCode)) {
    return { success: false, error: "Please enter a valid 6-digit PIN code." };
  }

  if (!isValidMapLink(mapLink)) {
    return { success: false, error: "Please add a valid Google Maps link." };
  }

  if (!hasValidTimeRange(openingTime, closingTime)) {
    return { success: false, error: "Closing time must be after opening time." };
  }

  if (!hasValidPlanDescriptions(rawPlansJson || "[]")) {
    return { success: false, error: "Each plan description can have up to 30 words." };
  }

  const extractedCoordinates = extractCoordinatesFromMapLink(mapLink);
  const latitude = formData.get("latitude")
    ? Number(formData.get("latitude"))
    : extractedCoordinates?.latitude ?? null;
  const longitude = formData.get("longitude")
    ? Number(formData.get("longitude"))
    : extractedCoordinates?.longitude ?? null;

  if (
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    !isValidLatitude(latitude) ||
    !isValidLongitude(longitude)
  ) {
    return { success: false, error: "Please provide valid latitude and longitude." };
  }

  const computedMetro = await findNearestMetro(latitude, longitude);
  const nearestMetro = overrideNearestMetro
    ? getTrimmedString(formData, "nearest_metro") || null
    : computedMetro?.nearest_metro ?? null;
  const nearestMetroDistanceKm = overrideNearestMetro
    ? (formData.get("nearest_metro_distance_km")
        ? Number.parseFloat(String(formData.get("nearest_metro_distance_km")))
        : null)
    : computedMetro?.nearest_metro_distance_km ?? null;
  const nearestMetroLine = overrideNearestMetro
    ? null
    : computedMetro?.nearest_metro_line ?? null;

  const payload = {
    display_name: displayName,
    locality,
    city,
    district,
    state,
    pin_code: pinCode,
    full_address: fullAddress,
    nearest_metro: nearestMetro,
    nearest_metro_line: nearestMetroLine,
    nearest_metro_distance_km:
      nearestMetroDistanceKm !== null && Number.isFinite(nearestMetroDistanceKm)
        ? nearestMetroDistanceKm
        : null,
    latitude,
    longitude,
    opening_time: openingTime,
    closing_time: closingTime,
    phone_number: phoneNumber,
    description,
    amenities_text: amenityValues.join(", "),
    map_link: mapLink,
    whatsapp_number: whatsappNumber,
    total_seats: totalSeats,
  };

  const cleanedPayload: TablesUpdate<"library_branches"> = Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [key, value === "" ? null : value]),
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

  await supabaseServer.from("library_fee_plans").delete().eq("library_branch_id", id);

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
    changedFields: [...Object.keys(cleanedPayload), "fee_plans"],
    notes: overrideNearestMetro
      ? "Nearest metro was manually overridden by staff."
      : "Nearest metro was recalculated from coordinates.",
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
