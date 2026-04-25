import { notFound } from "next/navigation";
import Image from "next/image";
import { unstable_cache } from "next/cache";
import { MapPin } from "lucide-react";
import { supabaseServer } from "@/lib/supabase-server";
import { type LibraryCardData, runLibraryCardQuery, withCardImage } from "@/lib/library-card-data";
import { logPerf, measureAsync } from "@/lib/perf";
import { getSiteUrl } from "@/lib/site-url";
import { DeferredSaveButton } from "@/components/deferred-save-button";
import { IntentLink } from "@/components/intent-link";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ city: string; slug: string }>;
}

// Convert slug back to locality name (e.g. "mukherjee-nagar" → "Mukherjee Nagar")
function slugToLocalityName(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

async function getLibrariesByLocality(city: string, locality: string): Promise<LibraryCardData[]> {
  return runLibraryCardQuery((selectClause) =>
    supabaseServer
      .from("library_branches")
      .select(selectClause)
      .eq("is_active", true)
      .ilike("city", city)
      .ilike("locality", locality)
      .order("profile_completeness_score", { ascending: false }),
  );
}

const getCachedLibrariesByLocality = unstable_cache(
  async (city: string, locality: string) => getLibrariesByLocality(city, locality),
  ["libraries-by-locality"],
  {
    revalidate: 120,
    tags: ["library-cards"],
  },
);

const getLocalityLibraries =
  process.env.NODE_ENV === "development" ? getLibrariesByLocality : getCachedLibrariesByLocality;

export async function generateStaticParams() {
  if (process.env.NODE_ENV === "development") {
    return [];
  }

  const { data } = await supabaseServer
    .from("library_branches")
    .select("city, locality")
    .not("locality", "is", null);
  const rows = (data as Array<{ city: string; locality: string | null }>) ?? [];

  const seen = new Set<string>();
  const params: { city: string; slug: string }[] = [];

  for (const row of rows) {
    if (!row.locality) continue;
    const key = `${row.city.toLowerCase()}-${row.locality}`;
    if (seen.has(key)) continue;
    seen.add(key);
    params.push({
      city: row.city.toLowerCase(),
      slug: row.locality.toLowerCase().replace(/\s+/g, "-"),
    });
  }
  return params;
}

export const revalidate = 120;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { city, slug } = await params;
  const locality = slugToLocalityName(slug);
  const cityLabel = city.charAt(0).toUpperCase() + city.slice(1);
  const siteUrl = getSiteUrl();
  const pageUrl = `${siteUrl}/${city}/locality/${slug}`;
  return {
    title: `Best Libraries in ${locality}, ${cityLabel}`,
    description: `Find the best study libraries in ${locality}, ${cityLabel}. Compare fees, amenities, timings, and metro access before choosing a study space.`,
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      type: "website",
      url: pageUrl,
      title: `Best Libraries in ${locality}, ${cityLabel} | LibraryNear`,
      description: `Compare study libraries, reading rooms, fees, amenities, and metro access in ${locality}, ${cityLabel}.`,
      siteName: "LibraryNear",
    },
  };
}

export default async function LocalityPage({ params }: PageProps) {
  const { city, slug } = await params;
  const locality = slugToLocalityName(slug);

  const librariesMeasurement = await measureAsync(
    "librariesByLocality",
    () => getLocalityLibraries(city, locality),
  );
  const libraries = librariesMeasurement.result.map(withCardImage);
  if (libraries.length === 0) notFound();
  logPerf("locality", [librariesMeasurement.metric], `city="${city}" locality="${locality}" count=${libraries.length}`);

  const cityLabel = city.charAt(0).toUpperCase() + city.slice(1);

  const siteUrl = getSiteUrl();
  const pageUrl = `${siteUrl}/${city}/locality/${slug}`;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: siteUrl,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: cityLabel,
          item: `${siteUrl}/${city}`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: locality,
          item: pageUrl,
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: `Best Libraries in ${locality}, ${cityLabel}`,
      url: pageUrl,
      description: `Browse study libraries and reading rooms in ${locality}, ${cityLabel}.`,
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: libraries.length,
        itemListElement: libraries.slice(0, 10).map((lib, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: lib.display_name,
          url: `${siteUrl}/${city}/library/${lib.slug}`,
        })),
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: `Why do students choose libraries in ${locality}?`,
          acceptedAnswer: {
            "@type": "Answer",
            text: `Students usually compare metro access, study environment, timings, amenities, and monthly fees before choosing a library in ${locality}.`,
          },
        },
        {
          "@type": "Question",
          name: `What should I compare before selecting a library in ${locality}?`,
          acceptedAnswer: {
            "@type": "Answer",
            text: `Shortlist libraries by location, seating, quiet environment, cleanliness, operating hours, and how close they are to your nearest metro station.`,
          },
        },
      ],
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="container mx-auto px-6 md:px-10 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <IntentLink href="/" className="hover:underline">Home</IntentLink>
          <span>/</span>
          <IntentLink href={`/${city}`} className="hover:underline capitalize">{cityLabel}</IntentLink>
          <span>/</span>
          <IntentLink href={`/${city}/libraries`} className="hover:underline">Libraries</IntentLink>
          <span>/</span>
          <span className="text-black font-medium">{locality}</span>
        </div>

        {/* Hero */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-black mb-3">
            Best Libraries in {locality}
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            Browse {libraries.length} study libraries and reading rooms in {locality}, {cityLabel}.
            Compare fees, amenities, timings, and distance from metro stations.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 gap-y-10">
          {libraries.map((lib, index) => (
            <IntentLink
              href={`/${city}/library/${lib.slug}`}
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
                  <div className="w-full h-full flex items-center justify-center">
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
              <div className="flex flex-col gap-0.5">
                <h2 className="font-semibold text-[14px] truncate text-black leading-snug">
                  {lib.display_name}
                </h2>
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

        {/* CTA */}
        <div className="mt-16 p-8 bg-muted/40 rounded-2xl text-center">
          <h2 className="text-xl font-bold mb-2">Explore more libraries in {cityLabel}</h2>
          <p className="text-muted-foreground text-sm mb-5">
            Search across all localities, filter by amenities, and find your perfect study spot.
          </p>
          <IntentLink
            href={`/${city}/libraries`}
            className="inline-flex items-center gap-2 bg-primary text-white font-semibold px-6 py-3 rounded-full hover:bg-primary/90 transition-colors"
          >
            Browse all libraries
          </IntentLink>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl border border-border/70 bg-slate-50/40 p-6">
            <h2 className="text-xl font-bold text-black">Why students shortlist libraries in {locality}</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              {locality} attracts students who want a practical mix of accessibility, study-friendly
              surroundings, and reliable daily routines. Start by comparing metro distance, seat
              availability, cleanliness, and how quiet the study environment feels during peak hours.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
