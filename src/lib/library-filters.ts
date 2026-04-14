export const AMENITY_FILTER_OPTIONS = [
  "AC",
  "Wi-Fi",
  "RO Water",
  "Washroom",
  "Power Backup",
  "CCTV",
  "Locker",
  "Parking",
  "Tea/Coffee",
  "Security Guard",
  "Charging Points",
  "Silent Zone",
] as const;

export const PRICE_RANGE_OPTIONS = [
  { value: "0-3000", label: "Up to Rs. 3,000", min: 0, max: 3000 },
  { value: "3001-6000", label: "Rs. 3,001 - 6,000", min: 3001, max: 6000 },
  { value: "6001-9000", label: "Rs. 6,001 - 9,000", min: 6001, max: 9000 },
  { value: "9001-plus", label: "Above Rs. 9,000", min: 9001, max: null },
] as const;

export function parseAmenitiesParam(value?: string | null) {
  if (!value) return [];

  return value
    .split(",")
    .map((item) => decodeURIComponent(item).trim())
    .filter(Boolean);
}

export function parseAmenitiesText(value?: string | null) {
  if (!value) return [];

  return value
    .split(/[,|\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function libraryHasAmenities(amenitiesText: string | null | undefined, requiredAmenities: string[]) {
  if (requiredAmenities.length === 0) return true;

  const normalizedAmenities = parseAmenitiesText(amenitiesText).map((item) => item.toLowerCase());
  return requiredAmenities.every((amenity) => normalizedAmenities.includes(amenity.toLowerCase()));
}

export function parsePriceRange(value?: string | null) {
  if (!value) return null;
  return PRICE_RANGE_OPTIONS.find((option) => option.value === value) ?? null;
}
