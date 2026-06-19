function parseCoordinatePair(value: string) {
  const match = value.match(/(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
  if (!match) return null;

  const latitude = Number(match[1]);
  const longitude = Number(match[2]);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    return null;
  }

  return { latitude, longitude };
}

/** Reasonable upper bound for a pasted map link. */
const MAX_MAP_LINK_LENGTH = 4000;

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    // Malformed percent-encoding — fall back to the raw string.
    return value;
  }
}

export function extractCoordinatesFromMapLink(mapLink: string | null | undefined) {
  if (!mapLink) return null;
  if (mapLink.length > MAX_MAP_LINK_LENGTH) return null;

  const decodedLink = safeDecodeURIComponent(mapLink);

  const atPattern = decodedLink.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (atPattern) {
    return parseCoordinatePair(`${atPattern[1]},${atPattern[2]}`);
  }

  const bangPattern = decodedLink.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (bangPattern) {
    return parseCoordinatePair(`${bangPattern[1]},${bangPattern[2]}`);
  }

  try {
    const url = new URL(decodedLink);
    const queryValue =
      url.searchParams.get("q") ||
      url.searchParams.get("query") ||
      url.searchParams.get("ll");

    const fromQuery = parseCoordinatePair(queryValue ?? "");
    if (fromQuery) return fromQuery;
  } catch {
    // Some pasted Google Maps links are not valid URL objects but still contain coordinates.
  }

  return parseCoordinatePair(decodedLink);
}
