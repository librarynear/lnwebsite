import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { MapPin, SlidersHorizontal, SearchX, ArrowRight, Navigation } from "lucide-react";
import { supabaseServer } from "@/lib/supabase-server";
import { getLibraryCoverImageMap } from "@/lib/library-images";
import { logPerf, measureAsync } from "@/lib/perf";
import { SearchBar } from "@/components/search-bar";
import { LibraryFilters } from "@/components/library-filters";
import { SaveButton } from "@/components/save-button";
import type { Tables } from "@/types/supabase";
import type { Metadata } from "next";

type Library = Tables<"library_branches">;

interface SearchResult {
  id: string;
  slug: string;
  city: string;
  display_name: string;
  locality: string | null;
  nearest_metro: string | null;
  nearest_metro_distance_km: number | null;
  verification_status: string | null;
  profile_completeness_score: number | null;
  distance_km?: number | null;
  rank?: number;
  coverImageUrl?: string | null;
}

interface NearbyRow {
  slug: string;
  city: string;
  distance_km: number | null;
}

interface PageProps {
  params: Promise<{ city: string }>;
  searchParams: Promise<{
    q?: string;
    locality?: string;
    sort?: string;
    verified?: string;
    nearby?: string;
    lat?: string;
    lng?: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { city } = await params;
  const cityLabel = city.charAt(0).toUpperCase() + city.slice(1);
  return {
    title: `Libraries in ${cityLabel} | StudyStash`,
    description: `Find the best study libraries in ${cityLabel}. Filter by locality, verify status, view fees and contact details.`,
  };
}

function formatDistance(distanceKm?: number | null) {
  if (typeof distanceKm !== "number") return null;
  if (distanceKm < 1) {
    return `${Math.max(50, Math.round(distanceKm * 1000))} m away`;
  }
  return `${distanceKm.toFixed(1)} km away`;
}

async function getNearbyLibraries(
  city: string,
  latitude: number,
  longitude: number,
  locality?: string,
  sort?: string,
  verifiedOnly?: boolean,
): Promise<SearchResult[]> {
  const { data: nearbyRows, error: nearbyError } = await supabaseServer.rpc(
    "nearby_library_suggestions" as never,
    {
      user_lat: latitude,
      user_lng: longitude,
      city_filter: city,
      max_results: 10,
    } as never,
  );

  if (nearbyError) {
    console.error("Nearby libraries error:", nearbyError.message);
    return [];
  }

  const suggestions = (nearbyRows ?? []) as NearbyRow[];
  if (suggestions.length === 0) {
    return [];
  }

  let detailsQuery = supabaseServer
    .from("library_branches")
    .select("id,slug,city,display_name,locality,nearest_metro,nearest_metro_distance_km,verification_status,profile_completeness_score")
    .eq("is_active", true)
    .ilike("city", city)
    .in("slug", suggestions.map((row) => row.slug));

  if (locality) detailsQuery = detailsQuery.eq("locality", locality);
  if (verifiedOnly) detailsQuery = detailsQuery.eq("verification_status", "verified");

  const { data: detailRows, error: detailError } = await detailsQuery;
  if (detailError) {
    console.error("Nearby library details error:", detailError.message);
    return [];
  }

  const distanceBySlug = new Map(suggestions.map((row) => [row.slug, row.distance_km ?? null]));
  const libraryBySlug = new Map(
    ((detailRows ?? []) as SearchResult[]).map((library) => [
      library.slug,
      {
        ...library,
        distance_km: distanceBySlug.get(library.slug) ?? null,
      },
    ]),
  );

  let results = suggestions
    .map((row) => libraryBySlug.get(row.slug))
    .filter(Boolean) as SearchResult[];

  switch (sort) {
    case "name_asc":
      results = [...results].sort((a, b) => a.display_name.localeCompare(b.display_name));
      break;
    case "verified":
      results = [...results].sort((a, b) => {
        const aVerified = a.verification_status === "verified" ? 0 : 1;
        const bVerified = b.verification_status === "verified" ? 0 : 1;
        if (aVerified !== bVerified) return aVerified - bVerified;
        return (a.distance_km ?? Number.MAX_SAFE_INTEGER) - (b.distance_km ?? Number.MAX_SAFE_INTEGER);
      });
      break;
    case "completeness":
      results = [...results].sort(
        (a, b) => (b.profile_completeness_score ?? 0) - (a.profile_completeness_score ?? 0),
      );
      break;
    default:
      break;
  }

  return results;
}

async function searchLibraries(
  city: string,
  q?: string,
  locality?: string,
  sort?: string,
  verifiedOnly?: boolean,
  nearbyMode?: boolean,
  latitude?: number,
  longitude?: number,
): Promise<{ results: SearchResult[]; usedRpc: boolean; mode: "browse" | "search" | "nearby" }> {
  if (nearbyMode && typeof latitude === "number" && typeof longitude === "number") {
    const results = await getNearbyLibraries(city, latitude, longitude, locality, sort, verifiedOnly);
    return { results, usedRpc: true, mode: "nearby" };
  }

  if (q) {
    const { data: rpcData, error: rpcError } = await supabaseServer.rpc("search_libraries" as never, {
      query_term: q,
      city_filter: city,
      max_results: 60,
    } as never);

    if (!rpcError && rpcData && (rpcData as SearchResult[]).length > 0) {
      let results = rpcData as SearchResult[];

      if (locality) results = results.filter((result) => result.locality === locality);
      if (verifiedOnly) results = results.filter((result) => result.verification_status === "verified");

      if (sort === "name_asc") {
        results = [...results].sort((a, b) => a.display_name.localeCompare(b.display_name));
      } else if (sort === "verified") {
        results = [...results].sort((a, b) => {
          const aVerified = a.verification_status === "verified" ? 0 : 1;
          const bVerified = b.verification_status === "verified" ? 0 : 1;
          return aVerified - bVerified;
        });
      } else if (sort === "completeness") {
        results = [...results].sort(
          (a, b) => (b.profile_completeness_score ?? 0) - (a.profile_completeness_score ?? 0),
        );
      }

      return { results, usedRpc: true, mode: "search" };
    }

    let fallbackQuery = supabaseServer
      .from("library_branches")
      .select("id,slug,city,display_name,locality,nearest_metro,nearest_metro_distance_km,verification_status,profile_completeness_score")
      .ilike("city", city)
      .or(`display_name.ilike.%${q}%,name.ilike.%${q}%,locality.ilike.%${q}%,nearest_metro.ilike.%${q}%`)
      .eq("is_active", true)
      .limit(60);

    if (locality) fallbackQuery = fallbackQuery.eq("locality", locality);
    if (verifiedOnly) fallbackQuery = fallbackQuery.eq("verification_status", "verified");

    switch (sort) {
      case "name_asc":
        fallbackQuery = fallbackQuery.order("display_name", { ascending: true });
        break;
      case "verified":
        fallbackQuery = fallbackQuery.order("verification_status", { ascending: false });
        break;
      case "completeness":
      default:
        fallbackQuery = fallbackQuery.order("profile_completeness_score", { ascending: false });
        break;
    }

    const { data: fallback } = await fallbackQuery;
    return { results: (fallback ?? []) as SearchResult[], usedRpc: false, mode: "search" };
  }

  let browseQuery = supabaseServer
    .from("library_branches")
    .select("id,slug,city,display_name,locality,nearest_metro,nearest_metro_distance_km,verification_status,profile_completeness_score")
    .ilike("city", city)
    .eq("is_active", true)
    .limit(60);

  if (locality) browseQuery = browseQuery.eq("locality", locality);
  if (verifiedOnly) browseQuery = browseQuery.eq("verification_status", "verified");

  switch (sort) {
    case "name_asc":
      browseQuery = browseQuery.order("display_name", { ascending: true });
      break;
    case "verified":
      browseQuery = browseQuery.order("verification_status", { ascending: false });
      break;
    case "completeness":
    default:
      browseQuery = browseQuery.order("profile_completeness_score", { ascending: false });
      break;
  }

  const { data, error } = await browseQuery;
  if (error) {
    console.error("Browse error:", error.message);
  }

  return { results: (data ?? []) as SearchResult[], usedRpc: false, mode: "browse" };
}

async function getZeroResultSuggestions(city: string): Promise<Library[]> {
  const { data } = await supabaseServer
    .from("library_branches")
    .select("id,slug,city,display_name,locality,nearest_metro,nearest_metro_distance_km,verification_status,profile_completeness_score")
    .ilike("city", city)
    .eq("is_active", true)
    .eq("verification_status", "verified")
    .order("profile_completeness_score", { ascending: false })
    .limit(8);

  return (data ?? []) as Library[];
}

async function getLocalities(city: string): Promise<string[]> {
  const { data } = await supabaseServer
    .from("library_branches")
    .select("locality")
    .ilike("city", city)
    .eq("is_active", true)
    .not("locality", "is", null);

  if (!data) return [];

  const counts: Record<string, number> = {};
  for (const row of data) {
    if (row.locality) {
      counts[row.locality] = (counts[row.locality] ?? 0) + 1;
    }
  }

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);
}

function LibraryCard({ lib, city, nearbyMode }: { lib: SearchResult; city: string; nearbyMode?: boolean }) {
  return (
    <Link href={`/${city}/library/${lib.slug}`} className="group flex flex-col gap-2 cursor-pointer">
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-muted">
        {lib.coverImageUrl ? (
          <Image
            src={lib.coverImageUrl}
            alt={`${lib.display_name} thumbnail`}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <MapPin className="h-10 w-10 text-muted-foreground/20" />
          </div>
        )}
        <SaveButton libraryId={lib.id} />
        {lib.verification_status === "verified" && (
          <div className="absolute top-3 left-3 bg-white/95 px-2 py-0.5 rounded-md text-xs font-bold border border-black/5 shadow-sm">
            Verified
          </div>
        )}
      </div>
      <div className="flex flex-col gap-0.5">
        <h3 className="font-semibold text-[14px] truncate text-black leading-snug">{lib.display_name}</h3>
        {nearbyMode && typeof lib.distance_km === "number" ? (
          <p className="text-[13px] font-medium text-sky-700 truncate">Nearby · {formatDistance(lib.distance_km)}</p>
        ) : lib.locality ? (
          <p className="text-[13px] text-muted-foreground truncate">{lib.locality}</p>
        ) : null}
        {lib.locality && nearbyMode && (
          <p className="text-[13px] text-muted-foreground truncate">{lib.locality}</p>
        )}
        {lib.nearest_metro && (
          <p className="text-[13px] text-muted-foreground truncate">
            {lib.nearest_metro_distance_km
              ? `${lib.nearest_metro_distance_km} km from ${lib.nearest_metro} metro`
              : `Near ${lib.nearest_metro}`}
          </p>
        )}
      </div>
    </Link>
  );
}

function ZeroResultState({
  q,
  locality,
  city,
  suggestions,
  nearbyMode,
}: {
  q?: string;
  locality?: string;
  city: string;
  suggestions: SearchResult[];
  nearbyMode?: boolean;
}) {
  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
          <SearchX className="h-8 w-8 text-muted-foreground/40" />
        </div>
        <div>
          <p className="text-lg font-semibold text-black">No results found</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            {nearbyMode
              ? "We couldn't find nearby libraries around your current location. Try removing filters or browse all libraries below."
              : q
                ? `We couldn't find libraries matching "${q}"${locality ? ` in ${locality}` : ""}. Try a different search or browse all libraries below.`
                : locality
                  ? `No libraries in ${locality} match your filters. Try a different search or browse all libraries below.`
                  : "No libraries match your current filters. Try a different search or browse all libraries below."}
          </p>
        </div>
        <Link
          href={`/${city}/libraries`}
          className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
        >
          Browse all libraries <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {suggestions.length > 0 && (
        <div>
          <p className="text-sm font-bold text-black mb-5">
            Top verified libraries in {city.charAt(0).toUpperCase() + city.slice(1)}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 gap-y-10">
            {suggestions.map((lib) => (
              <LibraryCard key={lib.id} lib={lib} city={city} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default async function LibrariesPage({ params, searchParams }: PageProps) {
  const { city } = await params;
  const { q, locality, sort, verified, nearby, lat, lng } = await searchParams;
  const verifiedOnly = verified === "1";
  const nearbyMode = nearby === "1";
  const latitude = lat ? Number(lat) : undefined;
  const longitude = lng ? Number(lng) : undefined;

  const [searchMeasurement, localitiesMeasurement] = await Promise.all([
    measureAsync("searchLibraries", () =>
      searchLibraries(city, q, locality, sort, verifiedOnly, nearbyMode, latitude, longitude),
    ),
    measureAsync("localities", () => getLocalities(city)),
  ]);

  const { results: libraries, usedRpc, mode } = searchMeasurement.result;
  const localities = localitiesMeasurement.result;

  const zeroResults = libraries.length === 0;
  const zeroSuggestionsMeasurement = zeroResults
    ? await measureAsync("zeroResults", () => getZeroResultSuggestions(city))
    : null;
  const suggestions = zeroSuggestionsMeasurement?.result ?? [];

  const coverImagesMeasurement = await measureAsync("coverImages", () =>
    getLibraryCoverImageMap([...libraries.map((lib) => lib.id), ...suggestions.map((lib) => lib.id)]),
  );
  const coverImageMap = coverImagesMeasurement.result;

  const librariesWithCovers = libraries.map((lib) => ({
    ...lib,
    coverImageUrl: coverImageMap[lib.id] ?? null,
  }));
  const suggestionsWithCovers = suggestions.map((lib) => ({
    ...lib,
    coverImageUrl: coverImageMap[lib.id] ?? null,
  })) as SearchResult[];

  logPerf(
    "librariesPage",
    [
      searchMeasurement.metric,
      localitiesMeasurement.metric,
      ...(zeroSuggestionsMeasurement ? [zeroSuggestionsMeasurement.metric] : []),
      coverImagesMeasurement.metric,
    ],
    `city="${city}" q="${q ?? ""}" locality="${locality ?? ""}" mode=${mode} usedRpc=${usedRpc} count=${libraries.length}`,
  );

  const cityLabel = city.charAt(0).toUpperCase() + city.slice(1);

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <div className="sticky top-20 z-30 bg-white border-b border-border/50 py-3">
        <div className="container mx-auto px-6 md:px-10">
          <div className="max-w-xl">
            <Suspense fallback={null}>
              <SearchBar city={city} />
            </Suspense>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 md:px-10 py-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/" className="hover:underline">Home</Link>
          <span>/</span>
          <Link href={`/${city}`} className="hover:underline capitalize">{cityLabel}</Link>
          <span>/</span>
          <span className="text-black font-medium">Libraries</span>
          {locality && (
            <>
              <span>/</span>
              <span className="text-black font-medium">{locality}</span>
            </>
          )}
        </div>

        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-black">
            {nearbyMode
              ? "Libraries near you"
              : q
                ? `Results for "${q}"`
                : locality
                  ? `Libraries in ${locality}`
                  : `Libraries in ${cityLabel}`}
          </h1>
          {!zeroResults && (
            <span className="text-sm text-muted-foreground shrink-0">
              {libraries.length} found
              {nearbyMode ? (
                <span className="ml-1 text-[11px] text-muted-foreground/70">(closest first)</span>
              ) : (
                usedRpc && q && <span className="ml-1 text-[11px] text-muted-foreground/60">(ranked)</span>
              )}
            </span>
          )}
        </div>

        {nearbyMode && !zeroResults && (
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-sm font-medium text-sky-800">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-sky-700 shadow-sm">
              <Navigation className="h-3.5 w-3.5" />
            </span>
            Showing the 10 closest libraries to your current location
          </div>
        )}

        <div className="flex gap-10 mt-6">
          <aside className="hidden lg:block w-56 shrink-0">
            <div className="sticky top-40">
              <Suspense fallback={null}>
                <LibraryFilters
                  city={city}
                  localities={localities}
                  currentLocality={locality}
                  currentSort={nearbyMode ? (sort ?? "distance") : sort}
                  currentQ={nearbyMode ? undefined : q}
                  verifiedOnly={verifiedOnly}
                  nearbyMode={nearbyMode}
                  nearbyLat={lat}
                  nearbyLng={lng}
                  totalCount={libraries.length}
                />
              </Suspense>
            </div>
          </aside>

          <div className="flex-1 min-w-0">
            <div className="flex lg:hidden items-center gap-2 mb-5 overflow-x-auto no-scrollbar pb-1">
              <div className="flex items-center gap-1 text-sm font-semibold border border-border rounded-full px-3 py-1.5 shrink-0">
                <SlidersHorizontal className="w-3.5 h-3.5" /> Filters
              </div>
              {nearbyMode && (
                <span className="flex items-center gap-1 bg-sky-50 text-sky-700 text-xs font-semibold px-3 py-1.5 rounded-full shrink-0">
                  Nearby
                </span>
              )}
              {locality && (
                <span className="flex items-center gap-1 bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full shrink-0">
                  {locality}
                </span>
              )}
              {verifiedOnly && (
                <span className="flex items-center bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full shrink-0">
                  Verified only
                </span>
              )}
            </div>

            {zeroResults ? (
              <ZeroResultState
                q={q}
                locality={locality}
                city={city}
                suggestions={suggestionsWithCovers}
                nearbyMode={nearbyMode}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 gap-y-10">
                {librariesWithCovers.map((lib) => (
                  <LibraryCard key={lib.id} lib={lib} city={city} nearbyMode={nearbyMode} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
