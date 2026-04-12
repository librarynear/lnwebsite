import "server-only";

import { supabaseServer } from "@/lib/supabase-server";
import { calculateLibraryProfileCompleteness } from "@/lib/library-profile-score";

const SCORE_SELECT = `
  display_name,
  city,
  locality,
  full_address,
  formatted_address,
  pin_code,
  phone_number,
  whatsapp_number,
  map_link,
  opening_time,
  closing_time,
  nearest_metro,
  nearest_metro_distance_km,
  description,
  amenities_text,
  total_seats,
  library_fee_plans (
    id,
    is_active
  ),
  library_images (
    id
  )
`;

export async function refreshLibraryProfileCompletenessScore(libraryId: string) {
  const { data: library } = await supabaseServer
    .from("library_branches")
    .select(SCORE_SELECT)
    .eq("id", libraryId)
    .maybeSingle();

  if (!library) return null;

  const score = calculateLibraryProfileCompleteness(library);

  await supabaseServer
    .from("library_branches")
    .update({ profile_completeness_score: score })
    .eq("id", libraryId);

  return score;
}
