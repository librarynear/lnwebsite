import "server-only";

import { extractCoordinatesFromMapLink } from "@/lib/maps-coordinates";

const GOOGLE_HOST_PATTERN = /(^|\.)google\.[a-z.]+$/i;
const GOOGLE_MAPS_SHORT_HOST_PATTERN = /(^|\.)maps\.app\.goo\.gl$/i;
const REQUEST_TIMEOUT_MS = 15_000;

function isGoogleMapsHost(hostname: string) {
  return GOOGLE_HOST_PATTERN.test(hostname) || GOOGLE_MAPS_SHORT_HOST_PATTERN.test(hostname);
}

export function isResolvableGoogleMapsLink(value: string | null | undefined) {
  if (!value) return false;

  try {
    const url = new URL(value);
    return isGoogleMapsHost(url.hostname);
  } catch {
    return false;
  }
}

export async function resolveGoogleMapsLink(value: string | null | undefined) {
  const rawValue = String(value ?? "").trim();
  if (!rawValue) {
    return null;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawValue);
  } catch {
    return null;
  }

  if (!isGoogleMapsHost(parsedUrl.hostname)) {
    return null;
  }

  if (extractCoordinatesFromMapLink(rawValue)) {
    return rawValue;
  }

  try {
    const response = await fetch(rawValue, {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
      },
    });
    const finalUrl = response.url || rawValue;
    const finalParsedUrl = new URL(finalUrl);
    if (!isGoogleMapsHost(finalParsedUrl.hostname)) {
      return null;
    }
    return finalUrl;
  } catch {
    return null;
  }
}

export async function resolveGoogleMapsCoordinates(value: string | null | undefined) {
  const resolvedUrl = await resolveGoogleMapsLink(value);
  if (!resolvedUrl) {
    return {
      resolvedUrl: null,
      coordinates: null,
      resolutionError: "invalid_map_link" as const,
    };
  }

  const coordinates = extractCoordinatesFromMapLink(resolvedUrl);
  if (!coordinates) {
    return {
      resolvedUrl,
      coordinates: null,
      resolutionError: "unresolvable_map_link" as const,
    };
  }

  return {
    resolvedUrl,
    coordinates,
    resolutionError: null,
  };
}
