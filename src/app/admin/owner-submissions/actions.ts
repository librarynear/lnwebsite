"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";
import { findNearestMetro } from "@/lib/nearest-metro";
import {
  getLibraryCacheTarget,
  revalidateLibraryContent,
} from "@/lib/revalidate-library-content";
import type { Json } from "@/types/supabase";
import { refreshLibraryProfileCompletenessScore } from "@/lib/library-profile-score-server";
import { buildLibraryFeePlanInsertRows, normalizePlanDrafts } from "@/lib/library-plans";

type SubmissionPayload = {
  id: string;
  display_name: string;
  city: string;
  locality: string | null;
  district: string | null;
  state: string | null;
  pin_code: string | null;
  full_address: string | null;
  nearest_metro: string | null;
  nearest_metro_distance_km: number | null;
  latitude: number | null;
  longitude: number | null;
  phone_number: string | null;
  whatsapp_number: string | null;
  opening_time: string | null;
  closing_time: string | null;
  total_seats: number | null;
  map_link: string | null;
  description: string | null;
  amenities_text: string | null;
  image_urls: string[] | null;
  fee_plans: Json | null;
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function getSubmission(id: string): Promise<SubmissionPayload | null> {
  const { data, error } = await supabaseServer
    .from("owner_library_submissions")
    .select(
      "id, display_name, city, locality, district, state, pin_code, full_address, nearest_metro, nearest_metro_distance_km, latitude, longitude, phone_number, whatsapp_number, opening_time, closing_time, total_seats, map_link, description, amenities_text, image_urls, fee_plans",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Failed to load owner submission:", error.message);
    return null;
  }

  return (data as SubmissionPayload) ?? null;
}

export async function approveOwnerSubmission(formData: FormData): Promise<void> {
  const id = formData.get("id") as string;
  if (!id) {
    redirect("/admin/owner-submissions");
  }
  const submission = await getSubmission(id);
  if (!submission) {
    redirect("/admin/owner-submissions");
  }

  if (!submission.pin_code) {
    redirect("/admin/owner-submissions");
  }

  const computedMetro =
    submission.latitude !== null && submission.longitude !== null
      ? await findNearestMetro(submission.latitude, submission.longitude)
      : null;

  const slugBase = slugify(submission.display_name);
  const slug = slugBase ? `${slugBase}-${submission.city.toLowerCase()}` : `${submission.id}`;

  const { data: existingData } = await supabaseServer
    .from("library_branches")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  const existing = (existingData as { id: string } | null) ?? null;

  const safeSlug = existing ? `${slug}-${submission.id.slice(0, 6)}` : slug;

  const { data: libraryData, error: insertError } = await supabaseServer
    .from("library_branches")
    .insert({
      slug: safeSlug,
      name: submission.display_name,
      display_name: submission.display_name,
      pin_code: submission.pin_code,
      city: submission.city,
      state: submission.state,
      locality: submission.locality,
      district: submission.district,
      full_address: submission.full_address,
      nearest_metro: computedMetro?.nearest_metro ?? submission.nearest_metro,
      nearest_metro_line: computedMetro?.nearest_metro_line ?? null,
      nearest_metro_distance_km:
        computedMetro?.nearest_metro_distance_km ?? submission.nearest_metro_distance_km,
      latitude: submission.latitude,
      longitude: submission.longitude,
      phone_number: submission.phone_number,
      whatsapp_number: submission.whatsapp_number,
      opening_time: submission.opening_time,
      closing_time: submission.closing_time,
      total_seats: submission.total_seats,
      map_link: submission.map_link,
      description: submission.description,
      amenities_text: submission.amenities_text,
      is_active: true,
      verification_status: "unverified",
      created_source: "owner_submission",
      last_admin_reviewed_at: new Date().toISOString(),
      last_owner_updated_at: new Date().toISOString(),
    })
    .select("id")
    .maybeSingle();
  const library = (libraryData as { id: string } | null) ?? null;

  if (insertError || !library) {
    console.error("Failed to create library from submission:", insertError?.message);
    redirect("/admin/owner-submissions");
  }

  if (Array.isArray(submission.image_urls) && submission.image_urls.length > 0) {
    await supabaseServer.from("library_images").insert(
      submission.image_urls.map((imageUrl, index) => ({
        library_branch_id: library.id,
        imagekit_url: imageUrl,
        is_cover: index === 0,
        sort_order: index,
      })),
    );
  }

  const feePlans = Array.isArray(submission.fee_plans)
    ? normalizePlanDrafts(submission.fee_plans)
    : [];
  if (feePlans.length > 0) {
    await supabaseServer.from("library_fee_plans").insert(
      buildLibraryFeePlanInsertRows(feePlans, library.id),
    );
  }

  await refreshLibraryProfileCompletenessScore(library.id);

  const { error: updateError } = await supabaseServer
    .from("owner_library_submissions")
    .update({
      status: "approved",
      submitted_library_branch_id: library.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateError) {
    console.error("Failed to update owner submission:", updateError.message);
    redirect("/admin/owner-submissions");
  }

  revalidatePath("/admin/owner-submissions");
  revalidateLibraryContent(await getLibraryCacheTarget(library.id));
  redirect("/admin/owner-submissions");
}

export async function requestChangesOwnerSubmission(formData: FormData): Promise<void> {
  const id = formData.get("id") as string;
  const notes = (formData.get("notes") as string) ?? "";
  if (!id) {
    redirect("/admin/owner-submissions");
  }
  const { error } = await supabaseServer
    .from("owner_library_submissions")
    .update({
      status: "needs_changes",
      reviewer_notes: notes || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    redirect("/admin/owner-submissions");
  }

  revalidatePath("/admin/owner-submissions");
  redirect("/admin/owner-submissions");
}

export async function rejectOwnerSubmission(formData: FormData): Promise<void> {
  const id = formData.get("id") as string;
  const notes = (formData.get("notes") as string) ?? "";
  if (!id) {
    redirect("/admin/owner-submissions");
  }
  const { error } = await supabaseServer
    .from("owner_library_submissions")
    .update({
      status: "rejected",
      reviewer_notes: notes || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    redirect("/admin/owner-submissions");
  }

  revalidatePath("/admin/owner-submissions");
  redirect("/admin/owner-submissions");
}
