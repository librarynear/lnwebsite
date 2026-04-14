"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { extractCoordinatesFromMapLink } from "@/lib/maps-coordinates";

function toInputValue(value: number | null) {
  return value === null || Number.isNaN(value) ? "" : String(value);
}

function readStoredMapDraft(storageKey?: string) {
  if (!storageKey || typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(storageKey);
    return raw
      ? (JSON.parse(raw) as {
          mapLink?: string;
          latitude?: string;
          longitude?: string;
        })
      : null;
  } catch {
    window.localStorage.removeItem(storageKey);
    return null;
  }
}

export function MapCoordinatesFields({
  initialMapLink = "",
  initialLatitude = null,
  initialLongitude = null,
  storageKey,
  mapLinkRequired = false,
  clearOnMount = false,
}: {
  initialMapLink?: string;
  initialLatitude?: number | null;
  initialLongitude?: number | null;
  storageKey?: string;
  mapLinkRequired?: boolean;
  clearOnMount?: boolean;
}) {
  const storedDraft = !clearOnMount ? readStoredMapDraft(storageKey) : null;
  const [mapLink, setMapLink] = useState(storedDraft?.mapLink ?? initialMapLink);
  const [latitude, setLatitude] = useState(storedDraft?.latitude ?? toInputValue(initialLatitude));
  const [longitude, setLongitude] = useState(storedDraft?.longitude ?? toInputValue(initialLongitude));

  useEffect(() => {
    if (storageKey && clearOnMount) {
      window.localStorage.removeItem(storageKey);
    }
  }, [clearOnMount, storageKey]);

  useEffect(() => {
    if (!storageKey) return;
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({ mapLink, latitude, longitude }),
    );
  }, [latitude, longitude, mapLink, storageKey]);

  const extracted = useMemo(() => extractCoordinatesFromMapLink(mapLink), [mapLink]);
  const status = !mapLink.trim()
    ? ""
    : extracted
      ? "Coordinates extracted from the Google Maps link."
      : "Could not extract coordinates from this link. You can enter them manually.";

  function handleMapLinkChange(value: string) {
    setMapLink(value);
    const nextExtracted = extractCoordinatesFromMapLink(value);
    if (nextExtracted) {
      setLatitude(String(nextExtracted.latitude));
      setLongitude(String(nextExtracted.longitude));
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="space-y-2 md:col-span-3">
        <label htmlFor="map_link" className="text-sm font-medium text-black">
          Google Maps link{mapLinkRequired ? <span className="text-destructive"> *</span> : null}
        </label>
        <Input
          id="map_link"
          name="map_link"
          value={mapLink}
          onChange={(event) => handleMapLinkChange(event.target.value)}
          placeholder="https://maps.google.com/..."
          className="rounded-2xl border-border/80 bg-slate-50/50 shadow-sm focus-visible:ring-primary/30"
          required={mapLinkRequired}
        />
        {status ? <p className="text-xs text-muted-foreground">{status}</p> : null}
      </div>

      <div className="space-y-2">
        <label htmlFor="latitude" className="text-sm font-medium text-black">
          Latitude
        </label>
        <Input
          id="latitude"
          name="latitude"
          type="number"
          step="0.000001"
          value={latitude}
          onChange={(event) => setLatitude(event.target.value)}
          className="rounded-2xl border-border/80 bg-slate-50/50 shadow-sm focus-visible:ring-primary/30"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="longitude" className="text-sm font-medium text-black">
          Longitude
        </label>
        <Input
          id="longitude"
          name="longitude"
          type="number"
          step="0.000001"
          value={longitude}
          onChange={(event) => setLongitude(event.target.value)}
          className="rounded-2xl border-border/80 bg-slate-50/50 shadow-sm focus-visible:ring-primary/30"
        />
      </div>

      <div className="hidden">
        <input type="hidden" name="coordinates_status" value={status} readOnly />
      </div>
    </div>
  );
}
