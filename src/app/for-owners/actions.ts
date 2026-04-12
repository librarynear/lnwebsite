"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { upsertProfileFromUser } from "@/lib/auth/profile";

export async function submitOwnerLibrary(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/for-owners");
  }

  await upsertProfileFromUser(user);

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
    phone_number: String(formData.get("phone_number") ?? "").trim(),
    whatsapp_number: String(formData.get("whatsapp_number") ?? "").trim() || null,
    opening_time: String(formData.get("opening_time") ?? "").trim() || null,
    closing_time: String(formData.get("closing_time") ?? "").trim() || null,
    total_seats: formData.get("total_seats")
      ? Number(formData.get("total_seats"))
      : null,
    map_link: String(formData.get("map_link") ?? "").trim() || null,
    description: String(formData.get("description") ?? "").trim() || null,
    amenities_text: String(formData.get("amenities_text") ?? "").trim() || null,
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
