import Image from "next/image";
import { unstable_cache } from "next/cache";
import { MapPin } from "lucide-react";
import { Suspense } from "react";
import { supabaseServer } from "@/lib/supabase-server";
import { type LibraryCardData, runLibraryCardQuery, withCardImage } from "@/lib/library-card-data";
import { logPerf, measureAsync } from "@/lib/perf";
import { DeferredSaveButton } from "@/components/deferred-save-button";
import { IntentLink } from "@/components/intent-link";
import { SearchBar } from "@/components/search-bar";

export const revalidate = 120;

async function getLibraries(locality?: string, q?: string): Promise<LibraryCardData[]> {
  return runLibraryCardQuery((selectClause) => {
    let query = supabaseServer
      .from("library_branches")
      .select(selectClause)
      .eq("is_active", true)
      .order("profile_completeness_score", { ascending: false })
      .limit(20);

    if (locality) query = query.eq("locality", locality);
    if (q) query = query.or(`name.ilike.%${q}%,locality.ilike.%${q}%,nearest_metro.ilike.%${q}%,display_name.ilike.%${q}%`);

    return query;
  });
}

async function getTopLocalities(): Promise<string[]> {
  const { data, error } = await supabaseServer
    .from("library_branches")
    .select("locality")
    .eq("is_active", true)
    .not("locality", "is", null);

  if (error || !data) return [];
  const localityRows = data as Array<{ locality: string | null }>;

  const counts: Record<string, number> = {};
  for (const row of localityRows) {
    if (row.locality) counts[row.locality] = (counts[row.locality] ?? 0) + 1;
  }

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .map(([name]) => name);
}

const getCachedTopLocalities = unstable_cache(
  async () => getTopLocalities(),
  ["home-top-localities"],
  {
    revalidate: 120,
    tags: ["home-top-localities"],
  },
);

const getCachedLibraries = unstable_cache(
  async (locality?: string, q?: string) => getLibraries(locality, q),
  ["home-libraries"],
  {
    revalidate: 120,
    tags: ["library-cards"],
  },
);

const getHomeTopLocalities =
  process.env.NODE_ENV === "development" ? getTopLocalities : getCachedTopLocalities;

const getHomeLibraries =
  process.env.NODE_ENV === "development" ? getLibraries : getCachedLibraries;

interface HomeProps {
  searchParams: Promise<{ locality?: string; q?: string }>;
}

export default async function Home({ searchParams }: HomeProps) {
  const { locality, q } = await searchParams;

  const [librariesMeasurement, topLocalitiesMeasurement] = await Promise.all([
    measureAsync("libraries", () => getHomeLibraries(locality, q)),
    measureAsync("topLocalitiesCached", () => getHomeTopLocalities()),
  ]);
  const libraries = librariesMeasurement.result.map(withCardImage);
  const topLocalities = topLocalitiesMeasurement.result;
  logPerf("home", [librariesMeasurement.metric, topLocalitiesMeasurement.metric], `locality="${locality ?? ""}" q="${q ?? ""}" count=${libraries.length}`);

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

      <div className="w-full border-b border-border/50 sticky top-20 bg-white z-30 shadow-sm">
        <div className="container mx-auto px-6 md:px-10 flex items-center gap-3 overflow-x-auto no-scrollbar py-4">

          {/* All tab */}
          <IntentLink
            href="/"
            className={`flex items-center justify-center px-4 py-2 rounded-full text-[13px] font-medium tracking-wide transition-all min-w-max ${!locality
                ? "bg-primary text-white shadow-sm"
                : "bg-white text-muted-foreground border border-primary/30 hover:border-primary hover:bg-primary/5 hover:text-primary"
              }`}
          >
            All Delhi
          </IntentLink>

          {topLocalities.map((loc) => (
            <IntentLink
              key={loc}
              href={`/?locality=${encodeURIComponent(loc)}`}
              className={`flex items-center justify-center px-4 py-2 rounded-full text-[13px] font-normal tracking-wide transition-all min-w-max ${locality === loc
                  ? "bg-primary text-white shadow-sm"
                  : "bg-white text-muted-foreground border border-primary/30 hover:border-primary hover:bg-primary/5 hover:text-primary"
                }`}
            >
              {loc}
            </IntentLink>
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
            <IntentLink href="/" className="text-sm text-primary font-medium hover:underline">
              Clear all
            </IntentLink>
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
            {libraries.map((lib, index) => (
              <IntentLink
                href={`/${lib.city.toLowerCase()}/library/${lib.slug}`}
                key={lib.id}
                className="group flex flex-col gap-2 cursor-pointer"
              >
                <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-muted">
                  {lib.coverImageUrl ? (
                    <Image
                      src={lib.coverImageUrl}
                      alt={`${lib.display_name} thumbnail`}
                      fill
                      priority={index < 4}
                      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 33vw, 20vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <MapPin className="h-10 w-10 text-muted-foreground/20" />
                    </div>
                  )}
                  <DeferredSaveButton libraryId={lib.id} />
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
              </IntentLink>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
