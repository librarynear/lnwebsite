import fs from "node:fs/promises";
import path from "node:path";

type MetroStation = {
  station_name: string;
  line_name: string;
  latitude: number;
  longitude: number;
};

let metroStationsCache: MetroStation[] | null = null;

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const radiusKm = 6371.0088;
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lng1Rad = (lng1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;
  const lng2Rad = (lng2 * Math.PI) / 180;
  const dLat = lat2Rad - lat1Rad;
  const dLng = lng2Rad - lng1Rad;
  const hav =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLng / 2) ** 2;

  return 2 * radiusKm * Math.asin(Math.sqrt(hav));
}

async function loadMetroStations() {
  if (metroStationsCache) return metroStationsCache;

  const candidates = [
    path.resolve(/* turbopackIgnore: true */ process.cwd(), "../Library Scraper/cache/delhi_metro_stations.json"),
    path.resolve(/* turbopackIgnore: true */ process.cwd(), "../Library Scraper/cache/delhi_metro_stations.geojson"),
  ];

  for (const candidate of candidates) {
    try {
      const raw = await fs.readFile(candidate, "utf8");
      const parsed = JSON.parse(raw) as unknown;

      if (Array.isArray(parsed)) {
        metroStationsCache = parsed
          .map((item) => item as Partial<MetroStation>)
          .filter(
            (item): item is MetroStation =>
              typeof item.station_name === "string" &&
              typeof item.latitude === "number" &&
              typeof item.longitude === "number" &&
              typeof item.line_name === "string",
          );
        return metroStationsCache;
      }

      if (
        parsed &&
        typeof parsed === "object" &&
        "features" in parsed &&
        Array.isArray((parsed as { features: unknown[] }).features)
      ) {
        metroStationsCache = (parsed as { features: unknown[] }).features
          .map((feature) => feature as {
            properties?: { station_name?: string; line_name?: string; name?: string; line?: string };
            geometry?: { coordinates?: [number, number] };
          })
          .filter((feature) => Array.isArray(feature.geometry?.coordinates))
          .map((feature) => ({
            station_name:
              feature.properties?.station_name ||
              feature.properties?.name ||
              "",
            line_name:
              feature.properties?.line_name ||
              feature.properties?.line ||
              "",
            latitude: Number(feature.geometry?.coordinates?.[1]),
            longitude: Number(feature.geometry?.coordinates?.[0]),
          }))
          .filter(
            (item): item is MetroStation =>
              Boolean(item.station_name) &&
              Number.isFinite(item.latitude) &&
              Number.isFinite(item.longitude),
          );
        return metroStationsCache;
      }
    } catch {
      continue;
    }
  }

  metroStationsCache = [];
  return metroStationsCache;
}

export async function findNearestMetro(latitude: number, longitude: number) {
  const stations = await loadMetroStations();
  if (!stations.length) return null;

  let bestStation: MetroStation | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const station of stations) {
    const distance = haversineKm(latitude, longitude, station.latitude, station.longitude);
    if (distance < bestDistance) {
      bestStation = station;
      bestDistance = distance;
    }
  }

  if (!bestStation) return null;

  return {
    nearest_metro: bestStation.station_name,
    nearest_metro_line: bestStation.line_name || null,
    nearest_metro_distance_km: Math.round(bestDistance * 100) / 100,
  };
}
