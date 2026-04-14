export const PLAN_CATEGORY_OPTIONS = [
  { value: "regular", label: "Regular" },
  { value: "offer", label: "Offer" },
] as const;

export const DURATION_OPTIONS = [
  { value: "1_month", label: "1 Month" },
  { value: "2_month", label: "2 Months" },
  { value: "3_month", label: "Quarterly" },
  { value: "4_month", label: "4 Months" },
  { value: "5_month", label: "5 Months" },
  { value: "6_month", label: "Half Yearly" },
  { value: "7_month", label: "7 Months" },
  { value: "8_month", label: "8 Months" },
  { value: "9_month", label: "9 Months" },
  { value: "10_month", label: "10 Months" },
  { value: "11_month", label: "11 Months" },
  { value: "12_month", label: "Yearly" },
] as const;

export const SEAT_TYPE_OPTIONS = [
  { value: "unreserved", label: "Unreserved" },
  { value: "reserved", label: "Reserved" },
] as const;

export type PlanCategory = (typeof PLAN_CATEGORY_OPTIONS)[number]["value"];
export type DurationKey = (typeof DURATION_OPTIONS)[number]["value"];
export type SeatType = (typeof SEAT_TYPE_OPTIONS)[number]["value"];

export type LibraryPlanDraft = {
  plan_category: PlanCategory;
  duration_key: DurationKey;
  duration_label: string;
  seat_type: SeatType;
  hours_per_day: number;
  description: string;
  base_price: number;
  discount_percentage: number;
  discounted_price: number;
  offer_name: string;
};

export const DEFAULT_PLAN: LibraryPlanDraft = {
  plan_category: "regular",
  duration_key: "1_month",
  duration_label: "1 Month",
  seat_type: "unreserved",
  hours_per_day: 1,
  description: "",
  base_price: 0,
  discount_percentage: 0,
  discounted_price: 0,
  offer_name: "",
};

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

export function getDurationLabel(durationKey: string | null | undefined) {
  return (
    DURATION_OPTIONS.find((option) => option.value === durationKey)?.label ??
    "1 Month"
  );
}

export function countWords(value: string) {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

export function limitWords(value: string, maxWords: number) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return value.trim();
  return words.slice(0, maxWords).join(" ");
}

export function calculateDiscountedPrice(basePrice: number, discountPercentage: number) {
  const price = Math.max(0, Math.floor(basePrice || 0));
  const discount = clampInt(discountPercentage, 0, 100, 0);
  return Math.floor((price * (100 - discount)) / 100);
}

export function normalizePlanDraft(input: Partial<LibraryPlanDraft> | null | undefined): LibraryPlanDraft {
  const durationKey = (input?.duration_key &&
    DURATION_OPTIONS.some((option) => option.value === input.duration_key)
      ? input.duration_key
      : DEFAULT_PLAN.duration_key) as DurationKey;
  const planCategory = (input?.plan_category &&
    PLAN_CATEGORY_OPTIONS.some((option) => option.value === input.plan_category)
      ? input.plan_category
      : DEFAULT_PLAN.plan_category) as PlanCategory;
  const seatType = (input?.seat_type &&
    SEAT_TYPE_OPTIONS.some((option) => option.value === input.seat_type)
      ? input.seat_type
      : DEFAULT_PLAN.seat_type) as SeatType;
  const basePrice = clampInt(input?.base_price, 0, 1000000, 0);
  const discountPercentage = clampInt(input?.discount_percentage, 0, 100, 0);

  return {
    plan_category: planCategory,
    duration_key: durationKey,
    duration_label: getDurationLabel(durationKey),
    seat_type: seatType,
    hours_per_day: clampInt(input?.hours_per_day, 1, 24, 1),
    description: limitWords(normalizeText(input?.description), 50),
    base_price: basePrice,
    discount_percentage: discountPercentage,
    discounted_price: calculateDiscountedPrice(basePrice, discountPercentage),
    offer_name: normalizeText(input?.offer_name),
  };
}

export function normalizePlanDrafts(input: unknown) {
  if (!Array.isArray(input)) return [];

  return input
    .map((item) => normalizePlanDraft(item as Partial<LibraryPlanDraft>))
    .filter((plan) => plan.base_price > 0);
}

export function buildPlanName(plan: LibraryPlanDraft) {
  const offerPrefix =
    plan.plan_category === "offer"
      ? plan.offer_name || "Offer"
      : "Regular";

  return `${offerPrefix} • ${plan.duration_label} • ${plan.seat_type === "reserved" ? "Reserved" : "Unreserved"}`;
}

export function parsePlanDraftsJson(rawValue: string | null | undefined) {
  if (!rawValue) return [];

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    return normalizePlanDrafts(parsed);
  } catch {
    return [];
  }
}

export function buildLibraryFeePlanInsertRows(
  plans: LibraryPlanDraft[],
  libraryBranchId: string,
) {
  return plans.map((plan, index) => ({
    library_branch_id: libraryBranchId,
    plan_name: buildPlanName(plan),
    plan_type: plan.plan_category === "offer" ? "offer" : "standard",
    plan_category: plan.plan_category,
    duration_key: plan.duration_key,
    duration_label: plan.duration_label,
    price: plan.discounted_price,
    base_price: plan.base_price,
    discount_percentage: plan.discount_percentage,
    discounted_price: plan.discounted_price,
    currency: "INR",
    seat_type: plan.seat_type,
    hours_per_day: plan.hours_per_day,
    description: plan.description || null,
    offer_name: plan.plan_category === "offer" ? plan.offer_name || null : null,
    sort_order: index,
    is_active: true,
  }));
}
