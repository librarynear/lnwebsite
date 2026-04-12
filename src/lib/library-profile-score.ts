import type { Tables } from "@/types/supabase";

type FeePlan = Tables<"library_fee_plans">;
type LibraryImage = Tables<"library_images">;
type LibraryBranch = Tables<"library_branches">;

type ScoreInput = Pick<
  LibraryBranch,
  | "display_name"
  | "city"
  | "locality"
  | "full_address"
  | "formatted_address"
  | "pin_code"
  | "phone_number"
  | "whatsapp_number"
  | "map_link"
  | "opening_time"
  | "closing_time"
  | "nearest_metro"
  | "nearest_metro_distance_km"
  | "description"
  | "amenities_text"
  | "total_seats"
> & {
  library_fee_plans?: FeePlan[] | null;
  library_images?: LibraryImage[] | null;
};

function hasValue(value: string | null | undefined) {
  return Boolean(value && value.trim().length > 0);
}

function hasAmenities(value: string | null | undefined) {
  if (!value) return false;
  return value
    .split(/[,•|\n]/)
    .map((item) => item.trim())
    .filter(Boolean).length > 0;
}

export function calculateLibraryProfileCompleteness(input: ScoreInput) {
  let score = 0;

  if (hasValue(input.display_name)) score += 8;
  if (hasValue(input.city)) score += 2;
  if (hasValue(input.locality)) score += 6;
  if (hasValue(input.full_address) || hasValue(input.formatted_address)) score += 8;
  if (hasValue(input.pin_code)) score += 2;
  if (hasValue(input.phone_number)) score += 8;
  if (hasValue(input.whatsapp_number)) score += 4;
  if (hasValue(input.map_link)) score += 6;
  if (hasValue(input.opening_time)) score += 4;
  if (hasValue(input.closing_time)) score += 4;
  if (hasValue(input.nearest_metro)) score += 6;
  if (typeof input.nearest_metro_distance_km === "number") score += 4;
  if (hasValue(input.description)) score += 10;
  if (hasAmenities(input.amenities_text)) score += 8;
  if (typeof input.total_seats === "number" && input.total_seats > 0) score += 4;
  if ((input.library_images ?? []).length > 0) score += 10;
  if ((input.library_fee_plans ?? []).some((plan) => plan.is_active !== false)) score += 6;

  return Math.min(100, score);
}
