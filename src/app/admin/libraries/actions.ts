"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase-server";

export async function updateLibraryBranch(id: string, formData: FormData) {
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
  };

  const feePlansJson = formData.get("fee_plans_json") as string;
  let feePlans: any[] = [];
  if (feePlansJson) {
    try {
      feePlans = JSON.parse(feePlansJson);
    } catch (e) {
      console.warn("Invalid fee plans JSON");
    }
  }

  // Convert empty strings to null for text fields where appropriate, 
  // though Supabase can handle empty strings for text.
  const cleanedPayload: any = Object.fromEntries(
    Object.entries(payload).map(([k, v]) => [k, v === "" ? null : v])
  );

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
    const plansToInsert = feePlans.map(plan => {
      const duration = plan.duration_label || 'Monthly';
      const seat = plan.seat_type || 'Unreserved';
      return {
        library_branch_id: id,
        duration_label: duration,
        plan_name: `${duration} - ${seat}`,
        price: plan.price ? parseFloat(plan.price) : 0,
        seat_type: seat
      };
    });
    await supabaseServer.from("library_fee_plans").insert(plansToInsert);
  }

  // Revalidate the admin page and the specific library page
  revalidatePath("/admin/libraries");
  
  // Since we don't safely know the dynamic slug here, revalidating everything or we could return success.
  // The layout/page for consumer UI is cached per path, so it might take 1hr to naturally revalidate, 
  // but let's revalidate the entire app router cache for simplicity.
  revalidatePath("/", "layout"); 

  return { success: true };
}
