import { countWords, normalizePlanDrafts } from "@/lib/library-plans";

export type OwnerValidationErrorCode =
  | "duplicate_submission"
  | "missing_required_fields"
  | "invalid_phone"
  | "invalid_map_link"
  | "invalid_coordinates"
  | "invalid_pin_code"
  | "invalid_timings"
  | "invalid_plan_description"
  | "too_many_images"
  | "too_few_images"
  | "invalid_image";

export function normalizeIndianPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  return null;
}

export function isValidPinCode(value: string) {
  return /^\d{6}$/.test(value);
}

export function isValidLatitude(value: number | null) {
  return typeof value === "number" && Number.isFinite(value) && value >= -90 && value <= 90;
}

export function isValidLongitude(value: number | null) {
  return typeof value === "number" && Number.isFinite(value) && value >= -180 && value <= 180;
}

export function isValidMapLink(value: string | null) {
  if (!value) return false;

  try {
    const url = new URL(value);
    return /google\.[a-z.]+$/.test(url.hostname) || /maps\.app\.goo\.gl$/i.test(url.hostname);
  } catch {
    return false;
  }
}

export function hasValidTimeRange(openingTime: string | null, closingTime: string | null) {
  if (!openingTime || !closingTime) return false;
  return closingTime > openingTime;
}

export function hasValidPlanDescriptions(rawPlansJson: string) {
  if (!rawPlansJson.trim()) {
    return true;
  }

  try {
    const plans = normalizePlanDrafts(JSON.parse(rawPlansJson || "[]"));
    return plans.every((plan) => countWords(plan.description) <= 30);
  } catch {
    return false;
  }
}
