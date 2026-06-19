"use server";

import { supabaseServer } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";

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
  const hdrs = await headers();
  const ip = getClientIp(hdrs);
  const rateCheck = checkRateLimit(ip, RATE_LIMITS.submitLead);
  if (!rateCheck.success) {
    return { success: false, error: "Too many requests. Please wait a moment and try again." };
  }

  if (!input.name?.trim()) return { success: false, error: "Name is required." };
  if (input.name.length > 200) return { success: false, error: "Name is too long." };
  if (!input.phone_number?.trim()) return { success: false, error: "Phone number is required." };
  if (input.phone_number.length > 20) return { success: false, error: "Invalid phone number." };
  if (!/^[6-9]\d{9}$/.test(input.phone_number.replace(/\s/g, ""))) {
    return { success: false, error: "Enter a valid 10-digit Indian mobile number." };
  }
  if (input.email && input.email.length > 320) return { success: false, error: "Email is too long." };
  if (input.message && input.message.length > 2000) return { success: false, error: "Message is too long." };
  if (!input.library_branch_id || input.library_branch_id.length > 100) {
    return { success: false, error: "Invalid library reference." };
  }

  const { error } = await supabaseServer.from("leads").insert({
    library_branch_id: input.library_branch_id,
    name: input.name.trim().slice(0, 200),
    phone_number: input.phone_number.trim(),
    email: input.email?.trim().slice(0, 320) || null,
    message: input.message?.trim().slice(0, 2000) || null,
    status: "new",
    source_page: input.source_page?.slice(0, 500) ?? null,
    preferred_contact_method: "phone",
  });

  if (error) {
    console.error("Lead insert error:", error.message);
    return { success: false, error: "Something went wrong. Please try calling directly." };
  }

  revalidatePath("/");
  return { success: true };
}
