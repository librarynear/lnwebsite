import Link from "next/link";
import Image from "next/image";
import { MapPin } from "lucide-react";
import { Suspense } from "react";
import { supabaseServer } from "@/lib/supabase-server";
import { getLibraryCoverImageMap } from "@/lib/library-images";
import { logPerf, measureAsync } from "@/lib/perf";
import { SaveButton } from "@/components/save-button";
import { SearchBar } from "@/components/search-bar";
import type { Tables } from "@/types/supabase";

type LibraryCardData = Pick<
  Tables<"library_branches">,
  | "id"
  | "slug"
  | "city"
  | "display_name"
  | "locality"
  | "nearest_metro"
  | "nearest_metro_distance_km"
  | "verification_status"
>;

async function getLibraries(locality?: string, q?: string): Promise<LibraryCardData[]> {
  let query = supabaseServer
    .from("library_branches")
    .select("id,slug,city,display_name,locality,nearest_metro,nearest_metro_distance_km,verification_status")
    .eq("is_active", true)
    .order("profile_completeness_score", { ascending: false })
    .limit(20);

  if (locality) query = query.eq("locality", locality);
  if (q) query = query.or(`name.ilike.%${q}%,locality.ilike.%${q}%,nearest_metro.ilike.%${q}%,display_name.ilike.%${q}%`);

  const { data, error } = await query;
  if (error) {
    console.error("Failed to fetch libraries:", error.message);
    return [];
  }
  return data ?? [];
}

async function getTopLocalities(): Promise<string[]> {
  const { data, error } = await supabaseServer
    .from("library_branches")
    .select("locality")
    .eq("is_active", true)
    .not("locality", "is", null);

  if (error || !data) return [];

  const counts: Record<string, number> = {};
  for (const row of data) {
    if (row.locality) counts[row.locality] = (counts[row.locality] ?? 0) + 1;
  }

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name]) => name);
}

interface HomeProps {
  searchParams: Promise<{ locality?: string; q?: string }>;
}

export default async function Home({ searchParams }: HomeProps) {
  const { locality, q } = await searchParams;

  const [librariesMeasurement, topLocalitiesMeasurement] = await Promise.all([
    measureAsync("libraries", () => getLibraries(locality, q)),
    measureAsync("topLocalities", () => getTopLocalities()),
  ]);
  const libraries = librariesMeasurement.result;
  const topLocalities = topLocalitiesMeasurement.result;
  const coverImagesMeasurement = await measureAsync(
    "coverImages",
    () => getLibraryCoverImageMap(libraries.map((lib) => lib.id)),
  );
  const coverImageMap = coverImagesMeasurement.result;
  logPerf("home", [librariesMeasurement.metric, topLocalitiesMeasurement.metric, coverImagesMeasurement.metric], `locality="${locality ?? ""}" q="${q ?? ""}" count=${libraries.length}`);

  return (
    <div className="flex flex-col min-h-screen">

      {/* SEARCH BAR */}
      <section className="w-full pt-8 pb-10 flex flex-col items-center justify-center bg-white border-b border-border/40">
        <div className="w-full max-w-[560px] px-4">
          <Suspense fallback={null}>
            <SearchBar />
          </Suspense>
        </div>
      </section>

      {/* LOCALITY FILTER TABS */}
      <div className="w-full border-b border-border/50 sticky top-20 bg-white z-30">
        <div className="container mx-auto px-6 md:px-10 flex items-center gap-8 overflow-x-auto no-scrollbar py-4">

          {/* All tab */}
          <Link
            href="/"
            className={`flex flex-col items-center gap-1.5 cursor-pointer transition-colors min-w-max pb-1 border-b-2 ${!locality ? "text-black border-black" : "text-muted-foreground border-transparent hover:border-black hover:text-black"
              }`}
          >
            <MapPin className="h-6 w-6" />
            <span className="text-xs font-medium">All Delhi</span>
          </Link>

          {topLocalities.map((loc) => (
            <Link
              key={loc}
              href={`/?locality=${encodeURIComponent(loc)}`}
              className={`flex flex-col items-center gap-1.5 cursor-pointer transition-colors min-w-max pb-1 border-b-2 ${locality === loc
                ? "text-black border-black"
                : "text-muted-foreground border-transparent hover:border-black hover:text-black"
                }`}
            >
              <MapPin className="h-6 w-6" />
              <span className="text-xs font-medium">{loc}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* LISTINGS GRID */}
      <section className="container mx-auto px-6 md:px-10 py-10 pb-20">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-black">
            {q
              ? `Results for "${q}"${locality ? ` in ${locality}` : ""}`
              : locality
                ? `Libraries in ${locality}`
                : `${libraries.length > 0 ? "20+" : "0"} libraries in Delhi`}
          </h2>
          {(locality || q) && (
            <Link href="/" className="text-sm text-primary font-medium hover:underline">
              Clear all
            </Link>
          )}
        </div>

        {libraries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <MapPin className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-lg font-medium">No libraries found</p>
            <p className="text-sm mt-1">Try a different locality</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 gap-y-10">
            {libraries.map((lib) => (
              <Link
                href={`/${lib.city.toLowerCase()}/library/${lib.slug}`}
                key={lib.id}
                className="group flex flex-col gap-2 cursor-pointer"
              >
                <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-muted">
                  {coverImageMap[lib.id] ? (
                    <Image
                      src={coverImageMap[lib.id]}
                      alt={`${lib.display_name} thumbnail`}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 33vw, 20vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
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

                {/* Info */}
                <div className="flex flex-col gap-0.5">
                  <h3 className="font-semibold text-[14px] truncate text-black leading-snug">
                    {lib.display_name}
                  </h3>
                  {lib.locality && (
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
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
