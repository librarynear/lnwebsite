"use client";

import { Search, MapPin, Building2, TrainFront, X, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import type { Suggestion } from "@/app/api/suggestions/route";

interface SearchBarProps {
  city?: string;
}

type NearbyCoords = {
  lat: number;
  lng: number;
};

function NearbyGlyph({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M19.4 4.6 15.7 18a1.1 1.1 0 0 1-2.02.23l-2.4-4.5a1.1 1.1 0 0 0-.45-.45l-4.5-2.4A1.1 1.1 0 0 1 6.56 8.9L20 5.2a.56.56 0 0 0-.6-.6Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function formatDistance(distanceKm: number) {
  if (distanceKm < 1) {
    return `${Math.max(50, Math.round(distanceKm * 1000))} m away`;
  }
  return `${distanceKm.toFixed(1)} km away`;
}

const TYPE_ICON = {
  library: Building2,
  locality: MapPin,
  metro: TrainFront,
  nearby: NearbyGlyph,
};

const GROUP_LABEL = {
  library: "Libraries",
  locality: "Localities",
  metro: "Metro Stations",
  nearby: "Nearby",
};
const ORDERED_TYPES = ["nearby", "library", "locality", "metro"] as const;

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 220;
const MAX_CACHED_QUERIES = 25;

function groupSuggestions(suggestions: Suggestion[]) {
  const groups: Record<string, Suggestion[]> = {};
  for (const s of suggestions) {
    if (!groups[s.type]) groups[s.type] = [];
    groups[s.type].push(s);
  }
  return groups;
}

export function SearchBar({ city = "delhi" }: SearchBarProps) {
  const router = useRouter();
  const currentParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState(currentParams.get("q") ?? "");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [nearbyMode, setNearbyMode] = useState(currentParams.get("nearby") === "1");
  const [nearbyCoords, setNearbyCoords] = useState<NearbyCoords | null>(() => {
    const lat = Number(currentParams.get("lat"));
    const lng = Number(currentParams.get("lng"));
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const cacheRef = useRef<Map<string, Suggestion[]>>(new Map());

  const fetchSuggestions = useCallback(async (q: string) => {
    const normalizedQuery = q.trim();
    if (normalizedQuery.length < MIN_QUERY_LENGTH) {
      abortRef.current?.abort();
      setLoading(false);
      setSuggestions([]);
      setOpen(false);
      setLocationError(null);
      return;
    }

    const cacheKey = `${city}:${normalizedQuery.toLowerCase()}`;
    const cached = cacheRef.current.get(cacheKey);
    if (cached) {
      setSuggestions(cached);
      setOpen(cached.length > 0);
      setHighlightedIndex(-1);
      setLoading(false);
      setLocationError(null);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const requestId = ++requestIdRef.current;
    setLoading(true);

    try {
      const startedAt = performance.now();
      const res = await fetch(
        `/api/suggestions?q=${encodeURIComponent(normalizedQuery)}&city=${encodeURIComponent(city)}`,
        { signal: controller.signal },
      );
      if (!res.ok) {
        throw new Error(`Suggestion request failed with ${res.status}`);
      }
      const json = await res.json();
      if (requestId !== requestIdRef.current) {
        return;
      }

      const nextSuggestions = json.suggestions ?? [];
      cacheRef.current.set(cacheKey, nextSuggestions);
      if (cacheRef.current.size > MAX_CACHED_QUERIES) {
        const oldestKey = cacheRef.current.keys().next().value;
        if (oldestKey) {
          cacheRef.current.delete(oldestKey);
        }
      }

      if (process.env.NODE_ENV !== "production") {
        console.debug(
          `[perf] suggestions client total=${(performance.now() - startedAt).toFixed(1)}ms q="${normalizedQuery}" count=${nextSuggestions.length}`,
          res.headers.get("Server-Timing") ? `server=${res.headers.get("Server-Timing")}` : "",
        );
      }

      setSuggestions(nextSuggestions);
      setOpen(nextSuggestions.length > 0);
      setHighlightedIndex(-1);
      setLocationError(null);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
      if (requestId !== requestIdRef.current) {
        return;
      }
      setSuggestions([]);
      setOpen(false);
      setHighlightedIndex(-1);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [city]);

  const fetchNearbySuggestions = useCallback(async (latitude: number, longitude: number) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const requestId = ++requestIdRef.current;
    setNearbyLoading(true);
    setLoading(false);
    setLocationError(null);

    const roundedLat = latitude.toFixed(3);
    const roundedLng = longitude.toFixed(3);
    const cacheKey = `nearby:${city}:${roundedLat}:${roundedLng}`;
    const cached = cacheRef.current.get(cacheKey);
    if (cached) {
      setSuggestions(cached);
      setOpen(cached.length > 0);
      setHighlightedIndex(-1);
      setNearbyLoading(false);
      return;
    }

    try {
      const startedAt = performance.now();
      const res = await fetch(
        `/api/suggestions?city=${encodeURIComponent(city)}&lat=${encodeURIComponent(roundedLat)}&lng=${encodeURIComponent(roundedLng)}`,
        { signal: controller.signal },
      );
      if (!res.ok) {
        throw new Error(`Nearby suggestion request failed with ${res.status}`);
      }

      const json = await res.json();
      if (requestId !== requestIdRef.current) {
        return;
      }

      const nextSuggestions = (json.suggestions ?? []) as Suggestion[];
      cacheRef.current.set(cacheKey, nextSuggestions);
      if (cacheRef.current.size > MAX_CACHED_QUERIES) {
        const oldestKey = cacheRef.current.keys().next().value;
        if (oldestKey) {
          cacheRef.current.delete(oldestKey);
        }
      }

      if (process.env.NODE_ENV !== "production") {
        console.debug(
          `[perf] nearby suggestions client total=${(performance.now() - startedAt).toFixed(1)}ms count=${nextSuggestions.length}`,
          res.headers.get("Server-Timing") ? `server=${res.headers.get("Server-Timing")}` : "",
        );
      }

      setSuggestions(nextSuggestions);
      setOpen(nextSuggestions.length > 0);
      setHighlightedIndex(-1);
      if (nextSuggestions.length === 0) {
        setLocationError("No nearby libraries found for your location.");
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
      if (requestId !== requestIdRef.current) {
        return;
      }
      setSuggestions([]);
      setOpen(false);
      setHighlightedIndex(-1);
      setLocationError("Unable to load nearby libraries right now.");
    } finally {
      if (requestId === requestIdRef.current) {
        setNearbyLoading(false);
      }
    }
  }, [city]);

  const navigateToNearbyResults = useCallback((coords: NearbyCoords) => {
    const params = new URLSearchParams();
    params.set("nearby", "1");
    params.set("lat", coords.lat.toFixed(4));
    params.set("lng", coords.lng.toFixed(4));
    params.set("q", "Nearby");
    const locality = currentParams.get("locality");
    if (locality) params.set("locality", locality);
    router.push(`/${city}/libraries?${params.toString()}`);
  }, [city, currentParams, router]);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    if (nearbyMode) {
      setNearbyMode(false);
      setNearbyCoords(null);
    }
    setHighlightedIndex(-1);
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), DEBOUNCE_MS);
  }

  function navigate(q: string) {
    setOpen(false);
    setHighlightedIndex(-1);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    const locality = currentParams.get("locality");
    if (locality) params.set("locality", locality);
    if (nearbyMode && nearbyCoords) {
      params.set("nearby", "1");
      params.set("lat", nearbyCoords.lat.toFixed(4));
      params.set("lng", nearbyCoords.lng.toFixed(4));
      params.set("q", "Nearby");
    }
    router.push(`/${city}/libraries?${params.toString()}`);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate(query);
  }

  function handleSuggestionClick(s: Suggestion) {
    if (s.type === "library" || s.type === "nearby") {
      router.push(`/${s.city}/library/${s.slug}`);
    } else if (s.type === "locality") {
      const params = new URLSearchParams();
      params.set("locality", s.label);
      router.push(`/${s.city}/libraries?${params.toString()}`);
    } else {
      // Metro suggestions route into a regular text search.
      navigate(s.label);
    }
    setOpen(false);
    setHighlightedIndex(-1);
  }

  function clearInput() {
    abortRef.current?.abort();
    setLoading(false);
    setNearbyLoading(false);
    setLocationError(null);
    setNearbyMode(false);
    setNearbyCoords(null);
    setQuery("");
    setSuggestions([]);
    setOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  }

  function handleNearMeClick() {
    if (!navigator.geolocation) {
      setLocationError("Location is not supported in this browser.");
      setOpen(false);
      return;
    }

    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: Number(position.coords.latitude.toFixed(4)),
          lng: Number(position.coords.longitude.toFixed(4)),
        };
        setNearbyMode(true);
        setNearbyCoords(coords);
        setQuery("Nearby");
        void fetchNearbySuggestions(coords.lat, coords.lng);
        navigateToNearbyResults(coords);
      },
      (error) => {
        const message =
          error.code === error.PERMISSION_DENIED
            ? "Location permission was denied."
            : "Unable to get your current location.";
        setLocationError(message);
        setSuggestions([]);
        setOpen(false);
        setHighlightedIndex(-1);
        setNearbyLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      },
    );
  }

  // Close on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setHighlightedIndex(-1);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    const nextNearbyMode = currentParams.get("nearby") === "1";
    const lat = Number(currentParams.get("lat"));
    const lng = Number(currentParams.get("lng"));
    const nextCoords = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
    const nextQuery = nextNearbyMode ? "Nearby" : currentParams.get("q") ?? "";

    setNearbyMode((current) => (current === nextNearbyMode ? current : nextNearbyMode));
    setNearbyCoords((current) => {
      if (!nextCoords && !current) return current;
      if (!nextCoords) return null;
      if (current?.lat === nextCoords.lat && current?.lng === nextCoords.lng) return current;
      return nextCoords;
    });
    setQuery((currentQuery) => (currentQuery === nextQuery ? currentQuery : nextQuery));
  }, [currentParams]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, []);

  const grouped = groupSuggestions(suggestions);
  const flatSuggestions = useMemo(
    () => ORDERED_TYPES.flatMap((type) => grouped[type] ?? []),
    [grouped],
  );

  useEffect(() => {
    if (!open) {
      setHighlightedIndex(-1);
      return;
    }

    if (flatSuggestions.length === 0) {
      setHighlightedIndex(-1);
    }
  }, [flatSuggestions, highlightedIndex, open]);

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || flatSuggestions.length === 0) {
      if (e.key === "ArrowDown" && suggestions.length > 0) {
        e.preventDefault();
        setOpen(true);
        setHighlightedIndex(0);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((current) => (current + 1) % flatSuggestions.length);
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((current) => (current <= 0 ? flatSuggestions.length - 1 : current - 1));
      return;
    }

    if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault();
      handleSuggestionClick(flatSuggestions[highlightedIndex]);
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setHighlightedIndex(-1);
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <form
        onSubmit={handleSearch}
        className="flex items-center w-full bg-white rounded-full shadow-[0_3px_15px_-2px_rgba(0,0,0,0.12)] border border-border hover:shadow-[0_4px_22px_-2px_rgba(0,0,0,0.16)] transition-shadow pl-8 pr-2 py-2"
      >
        <div className="flex-1 flex flex-col justify-center min-w-0">
          <span className="text-[11px] font-bold tracking-wider text-black">Where</span>
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
              onFocus={() => suggestions.length > 0 && setOpen(true)}
              placeholder="Locality, metro station, or library name..."
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground truncate pt-0.5 min-w-0"
              autoComplete="off"
            />
            {query && (
              <button
                type="button"
                onClick={clearInput}
                className="shrink-0 text-muted-foreground hover:text-black transition-colors"
                aria-label="Clear"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={handleNearMeClick}
              className={`shrink-0 inline-flex items-center gap-2 rounded-full border px-2 py-1 transition-all ${
                nearbyMode
                  ? "border-sky-200 bg-sky-50 text-sky-700 shadow-[0_4px_12px_-8px_rgba(14,116,144,0.65)]"
                  : "border-transparent bg-transparent text-muted-foreground hover:border-sky-100 hover:bg-sky-50 hover:text-sky-700"
              }`}
              aria-label="Find libraries near me"
              title="Find libraries near me"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                {nearbyLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <NearbyGlyph className="h-4 w-4" />
                )}
              </span>
              <span className="hidden text-xs font-semibold text-current sm:inline">
                {nearbyMode ? "Nearby" : "Near me"}
              </span>
            </button>
          </div>
        </div>
        <button
          type="submit"
          className="h-12 w-12 ml-2 rounded-full bg-primary text-white flex items-center justify-center shrink-0 hover:bg-primary/90 transition-colors shadow-sm"
          aria-label="Search"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" strokeWidth={3} />
          ) : (
            <Search className="h-5 w-5" strokeWidth={3} />
          )}
        </button>
      </form>

      {/* SUGGESTIONS DROPDOWN */}
      {open && suggestions.length > 0 && (
        <div className="absolute top-[calc(100%+8px)] left-0 right-0 z-50 bg-white rounded-2xl shadow-[0_8px_30px_-4px_rgba(0,0,0,0.18)] border border-border overflow-hidden">
          {(() => {
            let runningIndex = -1;
            return ORDERED_TYPES.map((type) => {
            const items = grouped[type];
            if (!items?.length) return null;
            const Icon = TYPE_ICON[type];
            return (
              <div key={type}>
                <div className="px-4 pt-3 pb-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {GROUP_LABEL[type]}
                  </p>
                </div>
                {items.map((s, i) => (
                  (() => {
                    runningIndex += 1;
                    const itemIndex = runningIndex;
                    const isActive = itemIndex === highlightedIndex;
                    return (
                      <button
                        key={i}
                        type="button"
                        onMouseEnter={() => setHighlightedIndex(itemIndex)}
                        onClick={() => handleSuggestionClick(s)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left ${
                          isActive ? "bg-muted/80" : "hover:bg-muted/60"
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isActive ? "bg-white shadow-sm" : "bg-muted"
                        }`}>
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-black truncate">{s.label}</div>
                          {s.type === "nearby" && typeof s.distance_km === "number" && (
                            <div className="text-[11px] text-muted-foreground">
                              {formatDistance(s.distance_km)}
                            </div>
                          )}
                        </div>
                        <span className="ml-auto text-xs text-muted-foreground shrink-0 capitalize">{s.city}</span>
                      </button>
                    );
                  })()
                ))}
              </div>
            );
          });
        })()}
          <div className="px-4 py-2.5 border-t border-border/50">
            <button
              type="button"
              onClick={() => (nearbyMode && nearbyCoords ? navigate("Nearby") : navigate(query))}
              className="text-sm text-primary font-semibold hover:underline flex items-center gap-1.5"
            >
              {nearbyMode ? <NearbyGlyph className="h-3.5 w-3.5" /> : <Search className="h-3.5 w-3.5" />}
              {nearbyMode ? "Show nearby libraries" : `Search all results for "${query}"`}
            </button>
          </div>
        </div>
      )}
      {locationError && (
        <p className="mt-2 px-2 text-xs text-muted-foreground">{locationError}</p>
      )}
    </div>
  );
}
