import metroStationsData from "@/data/delhi-metro-stations.json";

type MetroStation = {
  station_name: string;
  line_name: string;
  latitude: number;
  longitude: number;
};

const metroStations = (metroStationsData as Partial<MetroStation>[])
  .filter(
    (item): item is MetroStation =>
      typeof item.station_name === "string" &&
      typeof item.line_name === "string" &&
      typeof item.latitude === "number" &&
      typeof item.longitude === "number",
  );

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

export async function findNearestMetro(latitude: number, longitude: number) {
  if (!metroStations.length) return null;

  let bestStation: MetroStation | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const station of metroStations) {
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
