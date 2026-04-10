"use server";

import { supabaseServer } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

interface LeadInput {
  library_branch_id: string;
  name: string;
  phone_number: string;
  email?: string;
  message?: string;
  source_page?: string;
}

export type LeadResult =
  | { success: true }
  | { success: false; error: string };

export async function submitLead(input: LeadInput): Promise<LeadResult> {
  if (!input.name?.trim()) return { success: false, error: "Name is required." };
  if (!input.phone_number?.trim()) return { success: false, error: "Phone number is required." };
  if (!/^[6-9]\d{9}$/.test(input.phone_number.replace(/\s/g, ""))) {
    return { success: false, error: "Enter a valid 10-digit Indian mobile number." };
  }

  const { error } = await supabaseServer.from("leads").insert({
    library_branch_id: input.library_branch_id,
    name: input.name.trim(),
    phone_number: input.phone_number.trim(),
    email: input.email?.trim() || null,
    message: input.message?.trim() || null,
    status: "new",
    source_page: input.source_page ?? null,
    preferred_contact_method: "phone",
  });

  if (error) {
    console.error("Lead insert error:", error.message);
    return { success: false, error: "Something went wrong. Please try calling directly." };
  }

  revalidatePath("/");
  return { success: true };
}
