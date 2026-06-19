import "server-only";

import { extractCoordinatesFromMapLink } from "@/lib/maps-coordinates";

const GOOGLE_HOST_PATTERN = /(^|\.)google\.[a-z.]+$/i;
const GOOGLE_MAPS_SHORT_HOST_PATTERN = /(^|\.)maps\.app\.goo\.gl$/i;
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_REDIRECTS = 5;
const MAX_MAP_LINK_LENGTH = 4000;

const BLOCKED_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\.\d+\.\d+\.\d+$/,
  /^10\.\d+\.\d+\.\d+$/,
  /^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/,
  /^192\.168\.\d+\.\d+$/,
  /^169\.254\.\d+\.\d+$/,
  /^0\.0\.0\.0$/,
  /^\[::1?\]$/,
  /^metadata\.google\.internal$/i,
];

function isBlockedHost(hostname: string): boolean {
  return BLOCKED_HOST_PATTERNS.some((pattern) => pattern.test(hostname));
}

function isGoogleMapsHost(hostname: string) {
  return GOOGLE_HOST_PATTERN.test(hostname) || GOOGLE_MAPS_SHORT_HOST_PATTERN.test(hostname);
}

export function isResolvableGoogleMapsLink(value: string | null | undefined) {
  if (!value) return false;

  try {
    const url = new URL(value);
    if (isBlockedHost(url.hostname)) return false;
    return isGoogleMapsHost(url.hostname);
  } catch {
    return false;
  }
}

export async function resolveGoogleMapsLink(value: string | null | undefined) {
  const rawValue = String(value ?? "").trim();
  if (!rawValue || rawValue.length > MAX_MAP_LINK_LENGTH) {
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

  if (isBlockedHost(parsedUrl.hostname)) {
    return null;
  }

  if (extractCoordinatesFromMapLink(rawValue)) {
    return rawValue;
  }

  // Follow redirects manually so we can validate the host at EVERY hop (not
  // just the final one) and cap the number of redirects. This blocks SSRF via
  // a Google URL that 30x-redirects to an internal host.
  let currentUrl = rawValue;

  try {
    for (let i = 0; i <= MAX_REDIRECTS; i++) {
      const response = await fetch(currentUrl, {
        method: "GET",
        redirect: "manual",
        cache: "no-store",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
        },
      });

      // Discard any response body we don't intend to read.
      await response.body?.cancel().catch(() => {});

      const isRedirect = response.status >= 300 && response.status < 400;
      const location = response.headers.get("location");

      if (!isRedirect || !location) {
        return isGoogleMapsHost(new URL(currentUrl).hostname) ? currentUrl : null;
      }

      let nextUrl: URL;
      try {
        nextUrl = new URL(location, currentUrl);
      } catch {
        return null;
      }

      if (!isGoogleMapsHost(nextUrl.hostname) || isBlockedHost(nextUrl.hostname)) {
        return null;
      }

      currentUrl = nextUrl.toString();
    }

    // Too many redirects.
    return null;
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
