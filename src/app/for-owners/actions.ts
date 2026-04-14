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
import {
  getLibraryCacheTarget,
  revalidateLibraryContent,
} from "@/lib/revalidate-library-content";
import { supabaseServer } from "@/lib/supabase-server";

const MAX_OWNER_PHOTOS = 8;
const MAX_OWNER_PHOTO_BYTES = 8 * 1024 * 1024;

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
    throw new Error("Failed to upload owner submission image");
  }

  const result = (await response.json()) as { url?: string };
  if (!result.url) {
    throw new Error("Image upload did not return a URL");
  }

  return result.url;
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

  const mapLink = String(formData.get("map_link") ?? "").trim() || null;
  const extractedCoordinates = extractCoordinatesFromMapLink(mapLink);
  const latitude = formData.get("latitude")
    ? Number(formData.get("latitude"))
    : extractedCoordinates?.latitude ?? null;
  const longitude = formData.get("longitude")
    ? Number(formData.get("longitude"))
    : extractedCoordinates?.longitude ?? null;
  const feePlans = parsePlanDraftsJson(String(formData.get("fee_plans_json") ?? ""));
  const imageFiles = formData
    .getAll("photos")
    .filter((file): file is File => file instanceof File && file.size > 0);
  let imageUrls: string[] = [];

  if (imageFiles.length > MAX_OWNER_PHOTOS) {
    redirect("/for-owners?error=too_many_images");
  }

  const invalidImageFile = imageFiles.find(
    (file) => !file.type.startsWith("image/") || file.size > MAX_OWNER_PHOTO_BYTES,
  );
  if (invalidImageFile) {
    redirect("/for-owners?error=invalid_image");
  }

  try {
    imageUrls = await Promise.all(
      imageFiles.map((file) => uploadOwnerSubmissionImage(file, user.id)),
    );
  } catch (error) {
    console.error("Failed to upload owner submission photos:", error);
    redirect("/for-owners?error=image_upload_failed");
  }

  const amenityValues = formData.getAll("amenities");
  const amenitiesText =
    amenityValues.length > 0
      ? amenityValues.map((value) => String(value).trim()).filter(Boolean).join(", ")
      : String(formData.get("amenities_text") ?? "").trim() || null;

  const payload = {
    user_id: user.id,
    display_name: String(formData.get("display_name") ?? "").trim(),
    city: String(formData.get("city") ?? "").trim(),
    locality: String(formData.get("locality") ?? "").trim() || null,
    district: String(formData.get("district") ?? "").trim() || null,
    state: String(formData.get("state") ?? "").trim() || null,
    pin_code: String(formData.get("pin_code") ?? "").trim() || null,
    full_address: String(formData.get("full_address") ?? "").trim() || null,
    nearest_metro: String(formData.get("nearest_metro") ?? "").trim() || null,
    nearest_metro_distance_km: formData.get("nearest_metro_distance_km")
      ? Number(formData.get("nearest_metro_distance_km"))
      : null,
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null,
    phone_number: String(formData.get("phone_number") ?? "").trim(),
    whatsapp_number: String(formData.get("whatsapp_number") ?? "").trim() || null,
    opening_time: String(formData.get("opening_time") ?? "").trim() || null,
    closing_time: String(formData.get("closing_time") ?? "").trim() || null,
    total_seats: formData.get("total_seats")
      ? Number(formData.get("total_seats"))
      : null,
    map_link: mapLink,
    description: String(formData.get("description") ?? "").trim() || null,
    amenities_text: amenitiesText,
    image_urls: imageUrls.length > 0 ? imageUrls : null,
    fee_plans: feePlans.length > 0 ? feePlans : null,
  };

  if (!payload.display_name || !payload.city || !payload.phone_number) {
    redirect("/for-owners?error=missing_required_fields");
  }

  const { error } = await supabase.from("owner_library_submissions").insert(payload);

  if (error) {
    console.error("Failed to create owner submission:", error.message);
    redirect("/for-owners?error=submission_failed");
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
  const feePlans = parsePlanDraftsJson(String(formData.get("fee_plans_json") ?? ""));

  if (!submissionId) {
    redirect("/for-owners?plans_error=1");
  }

  const { data: submission, error: submissionError } = await supabase
    .from("owner_library_submissions")
    .select("id, user_id, submitted_library_branch_id")
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
  }

  redirect("/for-owners?plans_updated=1");
}
