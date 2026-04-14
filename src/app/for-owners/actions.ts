"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { upsertProfileFromUser } from "@/lib/auth/profile";
import { extractCoordinatesFromMapLink } from "@/lib/maps-coordinates";
import {
  buildLibraryFeePlanInsertRows,
  parsePlanDraftsJson,
} from "@/lib/library-plans";
import { refreshLibraryProfileCompletenessScore } from "@/lib/library-profile-score-server";
import { findNearestMetro } from "@/lib/nearest-metro";
import {
  getLibraryCacheTarget,
  revalidateLibraryContent,
} from "@/lib/revalidate-library-content";
import { supabaseServer } from "@/lib/supabase-server";
import {
  hasValidPlanDescriptions,
  hasValidTimeRange,
  isValidLatitude,
  isValidLongitude,
  isValidMapLink,
  isValidPinCode,
  normalizeIndianPhone,
} from "@/lib/owner-form-validation";
import { logLibraryActivity } from "@/lib/library-activity";

const MAX_OWNER_PHOTOS = 3;
const MAX_OWNER_PHOTO_BYTES = 5 * 1024 * 1024;

async function uploadOwnerSubmissionImage(file: File, userId: string) {
  const imagekitPrivateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  if (!imagekitPrivateKey) {
    throw new Error("ImageKit private key is not configured");
  }

  const imagekitFormData = new FormData();
  imagekitFormData.append("file", file);
  imagekitFormData.append("fileName", file.name.replace(/[^\w.-]+/g, "-") || "owner_submission.jpg");
  imagekitFormData.append("folder", `/owner-submissions/${userId}/`);

  const authHeader = "Basic " + Buffer.from(`${imagekitPrivateKey}:`).toString("base64");
  const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
    method: "POST",
    headers: {
      Authorization: authHeader,
    },
    body: imagekitFormData,
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(`Failed to upload owner submission image (${response.status})`);
  }

  const result = (await response.json()) as { url?: string };
  if (!result.url) {
    throw new Error("Image upload did not return a URL");
  }

  return result.url;
}

function ownerErrorRedirect(code: string): never {
  redirect(`/for-owners?error=${code}`);
}

export async function submitOwnerLibrary(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/for-owners");
  }

  await upsertProfileFromUser(user);

  const { count: existingCount } = await supabase
    .from("owner_library_submissions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if ((existingCount ?? 0) > 0) {
    ownerErrorRedirect("duplicate_submission");
  }

  const displayName = String(formData.get("display_name") ?? "").trim();
  const locality = String(formData.get("locality") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const district = String(formData.get("district") ?? "").trim() || null;
  const state = String(formData.get("state") ?? "").trim();
  const pinCode = String(formData.get("pin_code") ?? "").trim();
  const fullAddress = String(formData.get("full_address") ?? "").trim();
  const openingTime = String(formData.get("opening_time") ?? "").trim();
  const closingTime = String(formData.get("closing_time") ?? "").trim();
  const mapLink = String(formData.get("map_link") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const totalSeatsRaw = String(formData.get("total_seats") ?? "").trim();
  const totalSeats = totalSeatsRaw ? Number.parseInt(totalSeatsRaw, 10) : Number.NaN;
  const rawPhone = String(formData.get("phone_number") ?? "").trim();
  const rawWhatsapp = String(formData.get("whatsapp_number") ?? "").trim();
  const normalizedPhone = normalizeIndianPhone(rawPhone);
  const normalizedWhatsapp = rawWhatsapp ? normalizeIndianPhone(rawWhatsapp) : null;
  const rawPlansJson = String(formData.get("fee_plans_json") ?? "");
  const feePlans = parsePlanDraftsJson(rawPlansJson);
  const imageFiles = formData
    .getAll("photos")
    .filter((file): file is File => file instanceof File && file.size > 0);
  const amenityValues = formData
    .getAll("amenities")
    .map((value) => String(value).trim())
    .filter(Boolean);
  const amenitiesText = amenityValues.length > 0 ? amenityValues.join(", ") : null;

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
    !rawPhone ||
    !Number.isInteger(totalSeats) ||
    totalSeats < 1 ||
    amenityValues.length === 0
  ) {
    ownerErrorRedirect("missing_required_fields");
  }

  if (!normalizedPhone || (rawWhatsapp && !normalizedWhatsapp)) {
    ownerErrorRedirect("invalid_phone");
  }

  if (!isValidPinCode(pinCode)) {
    ownerErrorRedirect("invalid_pin_code");
  }

  if (!isValidMapLink(mapLink)) {
    ownerErrorRedirect("invalid_map_link");
  }

  if (!hasValidTimeRange(openingTime, closingTime)) {
    ownerErrorRedirect("invalid_timings");
  }

  if (!hasValidPlanDescriptions(rawPlansJson)) {
    ownerErrorRedirect("invalid_plan_description");
  }

  if (imageFiles.length === 0) {
    ownerErrorRedirect("too_few_images");
  }

  if (imageFiles.length > MAX_OWNER_PHOTOS) {
    ownerErrorRedirect("too_many_images");
  }

  const invalidImageFile = imageFiles.find(
    (file) => !file.type.startsWith("image/") || file.size > MAX_OWNER_PHOTO_BYTES,
  );
  if (invalidImageFile) {
    ownerErrorRedirect("invalid_image");
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
    ownerErrorRedirect("invalid_coordinates");
  }

  const nearestMetro = await findNearestMetro(latitude, longitude);
  const imageUrls: string[] = [];

  for (const [index, file] of imageFiles.entries()) {
    console.info(
      `[owner-submission] upload-start user=${user.id} index=${index + 1}/${imageFiles.length} name="${file.name}" size=${file.size}`,
    );

    try {
      const imageUrl = await uploadOwnerSubmissionImage(file, user.id);
      imageUrls.push(imageUrl);
      console.info(
        `[owner-submission] upload-success user=${user.id} index=${index + 1}/${imageFiles.length} name="${file.name}" url="${imageUrl}"`,
      );
    } catch (error) {
      console.error(
        `[owner-submission] upload-failed user=${user.id} index=${index + 1}/${imageFiles.length} name="${file.name}"`,
        error,
      );
      ownerErrorRedirect("image_upload_failed");
    }
  }

  const payload = {
    user_id: user.id,
    display_name: displayName,
    city,
    locality,
    district,
    state,
    pin_code: pinCode,
    full_address: fullAddress,
    nearest_metro: nearestMetro?.nearest_metro ?? null,
    nearest_metro_distance_km: nearestMetro?.nearest_metro_distance_km ?? null,
    latitude,
    longitude,
    phone_number: normalizedPhone,
    whatsapp_number: normalizedWhatsapp,
    opening_time: openingTime,
    closing_time: closingTime,
    total_seats: totalSeats,
    map_link: mapLink,
    description,
    amenities_text: amenitiesText,
    image_urls: imageUrls,
    fee_plans: feePlans.length > 0 ? feePlans : null,
  };

  const { error } = await supabase.from("owner_library_submissions").insert(payload);

  if (error) {
    console.error("Failed to create owner submission:", error.message);
    ownerErrorRedirect("submission_failed");
  }

  redirect("/for-owners?submitted=1");
}

export async function updateOwnerSubmissionPlans(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/for-owners");
  }

  const submissionId = String(formData.get("submission_id") ?? "").trim();
  const rawPlansJson = String(formData.get("fee_plans_json") ?? "");
  const feePlans = parsePlanDraftsJson(rawPlansJson);

  if (!submissionId || !hasValidPlanDescriptions(rawPlansJson)) {
    redirect("/for-owners?plans_error=1");
  }

  const { data: submission, error: submissionError } = await supabase
    .from("owner_library_submissions")
    .select("id, user_id, submitted_library_branch_id, display_name")
    .eq("id", submissionId)
    .maybeSingle();

  if (submissionError || !submission || submission.user_id !== user.id) {
    redirect("/for-owners?plans_error=1");
  }

  const { error } = await supabase
    .from("owner_library_submissions")
    .update({
      fee_plans: feePlans,
      updated_at: new Date().toISOString(),
    })
    .eq("id", submissionId);

  if (error) {
    redirect("/for-owners?plans_error=1");
  }

  if (submission.submitted_library_branch_id) {
    const libraryBranchId = submission.submitted_library_branch_id;
    const previousTarget = await getLibraryCacheTarget(libraryBranchId);

    await supabaseServer.from("library_fee_plans").delete().eq("library_branch_id", libraryBranchId);

    if (feePlans.length > 0) {
      await supabaseServer
        .from("library_fee_plans")
        .insert(buildLibraryFeePlanInsertRows(feePlans, libraryBranchId));
    }

    await refreshLibraryProfileCompletenessScore(libraryBranchId);
    const nextTarget = await getLibraryCacheTarget(libraryBranchId);
    revalidateLibraryContent(previousTarget);
    revalidateLibraryContent(nextTarget);
    await logLibraryActivity({
      libraryBranchId,
      actionType: "owner_plans_updated",
      changedFields: ["fee_plans"],
      notes: `Owner updated plans for ${submission.display_name}.`,
    });
  }

  redirect("/for-owners?plans_updated=1");
}
