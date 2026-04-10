import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { MapPin } from "lucide-react";
import { supabaseServer } from "@/lib/supabase-server";
import { getLibraryCoverImageMap } from "@/lib/library-images";
import { SaveButton } from "@/components/save-button";
import type { Tables } from "@/types/supabase";
import type { Metadata } from "next";

type Library = Tables<"library_branches">;

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

async function getLibrariesByLocality(city: string, locality: string): Promise<Library[]> {
  const { data, error } = await supabaseServer
    .from("library_branches")
    .select("*")
    .ilike("city", city)
    .ilike("locality", locality)
    .order("profile_completeness_score", { ascending: false });

  if (error || !data) return [];
  return data;
}

export async function generateStaticParams() {
  const { data } = await supabaseServer
    .from("library_branches")
    .select("city, locality")
    .not("locality", "is", null);

  const seen = new Set<string>();
  const params: { city: string; slug: string }[] = [];

  for (const row of data ?? []) {
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

export const revalidate = 3600;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { city, slug } = await params;
  const locality = slugToLocalityName(slug);
  const cityLabel = city.charAt(0).toUpperCase() + city.slice(1);
  return {
    title: `Best Libraries in ${locality}, ${cityLabel}`,
    description: `Find the best study libraries and reading rooms in ${locality}, ${cityLabel}. Compare fees, amenities, timing, and distance from metro.`,
  };
}

export default async function LocalityPage({ params }: PageProps) {
  const { city, slug } = await params;
  const locality = slugToLocalityName(slug);

  const libraries = await getLibrariesByLocality(city, locality);
  if (libraries.length === 0) notFound();
  const coverImageMap = await getLibraryCoverImageMap(libraries.map((lib) => lib.id));

  const cityLabel = city.charAt(0).toUpperCase() + city.slice(1);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Best Libraries in ${locality}, ${cityLabel}`,
    numberOfItems: libraries.length,
    itemListElement: libraries.slice(0, 10).map((lib, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: lib.display_name,
      url: `https://studystash.in/${city}/library/${lib.slug}`,
    })),
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="container mx-auto px-6 md:px-10 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/" className="hover:underline">Home</Link>
          <span>/</span>
          <Link href={`/${city}`} className="hover:underline capitalize">{cityLabel}</Link>
          <span>/</span>
          <Link href={`/${city}/libraries`} className="hover:underline">Libraries</Link>
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
          {libraries.map((lib) => (
            <Link
              href={`/${city}/library/${lib.slug}`}
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
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-16 p-8 bg-muted/40 rounded-2xl text-center">
          <h2 className="text-xl font-bold mb-2">Explore more libraries in {cityLabel}</h2>
          <p className="text-muted-foreground text-sm mb-5">
            Search across all localities, filter by amenities, and find your perfect study spot.
          </p>
          <Link
            href={`/${city}/libraries`}
            className="inline-flex items-center gap-2 bg-primary text-white font-semibold px-6 py-3 rounded-full hover:bg-primary/90 transition-colors"
          >
            Browse all libraries
          </Link>
        </div>
      </div>
    </div>
  );
}
