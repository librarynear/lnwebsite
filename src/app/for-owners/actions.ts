"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { upsertProfileFromUser } from "@/lib/auth/profile";
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
  isValidPinCode,
  normalizeIndianPhone,
} from "@/lib/owner-form-validation";
import { logLibraryActivity } from "@/lib/library-activity";
import { resolveGoogleMapsCoordinates } from "@/lib/server/google-maps-resolver";

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

type EditableOwnerSubmissionStatus = "needs_changes" | "rejected";

type ExistingOwnerSubmission = {
  id: string;
  status: string;
  image_urls: string[] | null;
  submitted_library_branch_id: string | null;
};

function getTrimmedString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function getExistingImageUrls(formData: FormData) {
  return formData
    .getAll("existing_image_urls")
    .map((value) => String(value).trim())
    .filter(Boolean);
}

function isEditableOwnerSubmissionStatus(status: string): status is EditableOwnerSubmissionStatus {
  return status === "needs_changes" || status === "rejected";
}

async function loadExistingOwnerSubmission(userId: string) {
  const { data, error } = await supabaseServer
    .from("owner_library_submissions")
    .select("id, status, image_urls, submitted_library_branch_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to load owner submission:", error.message);
    return null;
  }

  return (data as ExistingOwnerSubmission | null) ?? null;
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

  const existingSubmission = await loadExistingOwnerSubmission(user.id);
  if (
    existingSubmission &&
    !isEditableOwnerSubmissionStatus(existingSubmission.status)
  ) {
    ownerErrorRedirect("duplicate_submission");
  }

  const displayName = getTrimmedString(formData, "display_name");
  const locality = getTrimmedString(formData, "locality");
  const city = getTrimmedString(formData, "city");
  const district = getTrimmedString(formData, "district") || null;
  const state = getTrimmedString(formData, "state");
  const pinCode = getTrimmedString(formData, "pin_code");
  const fullAddress = getTrimmedString(formData, "full_address");
  const openingTime = getTrimmedString(formData, "opening_time");
  const closingTime = getTrimmedString(formData, "closing_time");
  const rawMapLink = getTrimmedString(formData, "map_link");
  const description = getTrimmedString(formData, "description") || null;
  const totalSeatsRaw = getTrimmedString(formData, "total_seats");
  const totalSeats = totalSeatsRaw ? Number.parseInt(totalSeatsRaw, 10) : Number.NaN;
  const rawPhone = getTrimmedString(formData, "phone_number");
  const rawWhatsapp = getTrimmedString(formData, "whatsapp_number");
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
  const existingImageUrls = existingSubmission ? getExistingImageUrls(formData) : [];

  if (
    !displayName ||
    !locality ||
    !city ||
    !state ||
    !pinCode ||
    !fullAddress ||
    !openingTime ||
    !closingTime ||
    !rawMapLink ||
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

  if (!hasValidTimeRange(openingTime, closingTime)) {
    ownerErrorRedirect("invalid_timings");
  }

  if (!hasValidPlanDescriptions(rawPlansJson)) {
    ownerErrorRedirect("invalid_plan_description");
  }

  if (imageFiles.length + existingImageUrls.length === 0) {
    ownerErrorRedirect("too_few_images");
  }

  if (imageFiles.length + existingImageUrls.length > MAX_OWNER_PHOTOS) {
    ownerErrorRedirect("too_many_images");
  }

  const invalidImageFile = imageFiles.find(
    (file) => !file.type.startsWith("image/") || file.size > MAX_OWNER_PHOTO_BYTES,
  );
  if (invalidImageFile) {
    ownerErrorRedirect("invalid_image");
  }

  const resolvedMap = await resolveGoogleMapsCoordinates(rawMapLink);
  if (resolvedMap.resolutionError === "invalid_map_link") {
    ownerErrorRedirect("invalid_map_link");
  }
  if (resolvedMap.resolutionError === "unresolvable_map_link") {
    ownerErrorRedirect("unresolvable_map_link");
  }

  const latitude = formData.get("latitude")
    ? Number(formData.get("latitude"))
    : resolvedMap.coordinates?.latitude ?? null;
  const longitude = formData.get("longitude")
    ? Number(formData.get("longitude"))
    : resolvedMap.coordinates?.longitude ?? null;

  if (
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    !isValidLatitude(latitude) ||
    !isValidLongitude(longitude)
  ) {
    ownerErrorRedirect("invalid_coordinates");
  }

  const nearestMetro = await findNearestMetro(latitude, longitude);
  const imageUrls = [...existingImageUrls];

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
    map_link: resolvedMap.resolvedUrl,
    description,
    amenities_text: amenitiesText,
    image_urls: imageUrls,
    fee_plans: feePlans.length > 0 ? feePlans : null,
    status: "pending_review",
    reviewer_notes: null,
    reviewed_at: null,
    updated_at: new Date().toISOString(),
  };

  const error = existingSubmission
    ? (
        await supabaseServer
          .from("owner_library_submissions")
          .update({
            ...payload,
            submitted_library_branch_id: existingSubmission.submitted_library_branch_id,
          })
          .eq("id", existingSubmission.id)
          .eq("user_id", user.id)
      ).error
    : (
        await supabase
          .from("owner_library_submissions")
          .insert(payload)
      ).error;

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

  const { data: submission, error: submissionError } = await supabaseServer
    .from("owner_library_submissions")
    .select("id, user_id, status, submitted_library_branch_id, display_name")
    .eq("id", submissionId)
    .maybeSingle();

  if (submissionError || !submission || submission.user_id !== user.id) {
    redirect("/for-owners?plans_error=1");
  }

  const { error } = await supabaseServer
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

    const { error: deletePlansError } = await supabaseServer
      .from("library_fee_plans")
      .delete()
      .eq("library_branch_id", libraryBranchId);
    if (deletePlansError) {
      console.error("Failed to delete existing library fee plans:", deletePlansError.message);
      redirect("/for-owners?plans_error=1");
    }

    if (feePlans.length > 0) {
      const { error: insertPlansError } = await supabaseServer
        .from("library_fee_plans")
        .insert(buildLibraryFeePlanInsertRows(feePlans, libraryBranchId));
      if (insertPlansError) {
        console.error("Failed to insert updated library fee plans:", insertPlansError.message);
        redirect("/for-owners?plans_error=1");
      }
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
