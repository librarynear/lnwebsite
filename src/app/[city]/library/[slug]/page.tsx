import { notFound } from "next/navigation";
import Link from "next/link";
import { unstable_cache } from "next/cache";
import { MapPin, Clock, ShieldCheck, ExternalLink, Navigation } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabaseServer } from "@/lib/supabase-server";
import { getOptimizedImageUrl } from "@/lib/library-images";
import { logPerf, measureAsync } from "@/lib/perf";
import { EnquiryForm } from "@/components/enquiry-form";
import type { Tables } from "@/types/supabase";
import type { Metadata } from "next";
import { FeePlansList } from "@/components/fee-plans-list";
import { AmenitiesGrid } from "@/components/amenities-grid";
import { MapEmbed } from "@/components/map-embed";
import { LibraryDetailActions } from "@/components/library-detail-actions";
import { LibraryPhotoGallery } from "@/components/library-photo-gallery";
import { getSiteUrl } from "@/lib/site-url";

type LibraryBranch = Tables<"library_branches">;
type FeePlan = Tables<"library_fee_plans">;
type LibraryImage = Pick<Tables<"library_images">, "imagekit_url" | "sort_order" | "is_cover">;

type LibraryDetailData = Pick<
  LibraryBranch,
  | "id"
  | "slug"
  | "city"
  | "display_name"
  | "locality"
  | "district"
  | "formatted_address"
  | "full_address"
  | "latitude"
  | "longitude"
  | "map_link"
  | "nearest_metro"
  | "nearest_metro_distance_km"
  | "verification_status"
  | "opening_time"
  | "closing_time"
  | "pin_code"
  | "description"
  | "amenities_text"
  | "total_seats"
  | "phone_number"
  | "state"
> & {
  library_fee_plans: FeePlan[] | null;
  library_images: LibraryImage[] | null;
};

const LIBRARY_DETAIL_SELECT = `
  id,
  slug,
  city,
  display_name,
  locality,
  district,
  formatted_address,
  full_address,
  latitude,
  longitude,
  map_link,
  nearest_metro,
  nearest_metro_distance_km,
  verification_status,
  opening_time,
  closing_time,
  pin_code,
  description,
  amenities_text,
  total_seats,
  phone_number,
  state,
  library_fee_plans (
    id,
    library_branch_id,
    plan_name,
    price,
    currency,
    description,
    duration_label,
    seat_type,
    sort_order,
    is_active
  ),
  library_images (
    imagekit_url,
    sort_order,
    is_cover
  )
`;

interface PageProps {
  params: Promise<{ city: string; slug: string }>;
}

// Pre-render all library pages at build time
export async function generateStaticParams() {
  if (process.env.NODE_ENV === "development") {
    return [];
  }

  const { data } = await supabaseServer
    .from("library_branches")
    .select("city, slug");
  const rows = (data as Array<Pick<LibraryBranch, "city" | "slug">>) ?? [];
  return rows.map((b) => ({ city: b.city.toLowerCase(), slug: b.slug }));
}

export const revalidate = 120;

function normalizeLibraryDetail(data: LibraryDetailData): LibraryDetailData {
  const library_fee_plans = (data.library_fee_plans ?? [])
    .filter((plan) => plan.is_active !== false)
    .sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));

  const library_images = [...(data.library_images ?? [])].sort((a, b) => {
    const aPriority = a.is_cover ? 0 : 1;
    const bPriority = b.is_cover ? 0 : 1;
    if (aPriority !== bPriority) return aPriority - bPriority;
    return (a.sort_order ?? 999) - (b.sort_order ?? 999);
  });

  return {
    ...data,
    library_fee_plans,
    library_images,
  };
}

async function getLibraryDetailData(slug: string): Promise<LibraryDetailData | null> {
  const { data, error } = await supabaseServer
    .from("library_branches")
    .select(LIBRARY_DETAIL_SELECT)
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (error || !data) return null;
  return normalizeLibraryDetail(data as LibraryDetailData);
}

const getCachedLibraryDetailData = unstable_cache(
  async (slug: string) => getLibraryDetailData(slug),
  ["library-detail-data"],
  {
    revalidate: 120,
    tags: ["library-detail", "library-cards"],
  },
);

const getLibraryDetailForRoute =
  process.env.NODE_ENV === "development" ? getLibraryDetailData : getCachedLibraryDetailData;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { city, slug } = await params;
  const lib = await getLibraryDetailForRoute(slug);
  if (!lib) return { title: "Library Not Found" };

  const siteUrl = getSiteUrl();
  const pageUrl = `${siteUrl}/${city}/library/${slug}`;
  const previewImage =
    (lib.library_images?.[0]?.imagekit_url
      ? getOptimizedImageUrl(lib.library_images[0].imagekit_url, "detailHero")
      : null) || `${siteUrl}/logo.png`;
  const previewTitle = `${lib.display_name}${lib.locality ? `, ${lib.locality}` : ""} | LibraryNear`;
  const previewDescription = [
    `Study at ${lib.display_name}`,
    lib.locality ?? lib.district ?? lib.city,
    lib.nearest_metro ? `Near ${lib.nearest_metro}` : null,
    "See photos, fees, amenities, and directions.",
  ]
    .filter(Boolean)
    .join(". ");

  return {
    title: previewTitle,
    description: previewDescription,
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      type: "website",
      url: pageUrl,
      title: previewTitle,
      description: previewDescription,
      siteName: "LibraryNear",
      images: [
        {
          url: previewImage,
          width: 1200,
          height: 800,
          alt: `${lib.display_name} on LibraryNear`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: previewTitle,
      description: previewDescription,
      images: [previewImage],
    },
  };
}

function parseAmenities(amenitiesText: string | null): string[] {
  if (!amenitiesText) return [];
  return amenitiesText
    .split(/[,•|\n]/)
    .map((a) => a.trim())
    .filter(Boolean)
    .slice(0, 12);
}

export default async function LibraryDetailPage({ params }: PageProps) {
  const { city, slug } = await params;

  const libraryMeasurement = await measureAsync(
    "libraryDetailData",
    () => getLibraryDetailForRoute(slug),
  );
  const lib = libraryMeasurement.result;
  if (!lib) notFound();

  const feePlans = lib.library_fee_plans ?? [];
  const images = (lib.library_images ?? [])
    .map((image, index) =>
      getOptimizedImageUrl(image.imagekit_url, index === 0 ? "detailHero" : "detailThumb"),
    )
    .filter((imageUrl): imageUrl is string => Boolean(imageUrl));
  const amenities = parseAmenities(lib.amenities_text);
  logPerf(
    "libraryDetail",
    [libraryMeasurement.metric],
    `slug="${slug}" city="${city}" images=${images.length} feePlans=${feePlans.length}`,
  );

  const walkingMins = lib.nearest_metro_distance_km
    ? Math.round(lib.nearest_metro_distance_km * 12)
    : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: lib.display_name,
    description: `Study library in ${lib.locality ?? lib.city}`,
    address: {
      "@type": "PostalAddress",
      streetAddress: lib.full_address ?? lib.formatted_address,
      addressLocality: lib.locality ?? lib.district,
      addressRegion: lib.state ?? "Delhi",
      postalCode: lib.pin_code,
      addressCountry: "IN",
    },
    ...(lib.latitude && lib.longitude ? {
      geo: {
        "@type": "GeoCoordinates",
        latitude: lib.latitude,
        longitude: lib.longitude,
      }
    } : {}),
    ...(lib.phone_number ? { telephone: lib.phone_number } : {}),
    ...(lib.opening_time && lib.closing_time ? {
      openingHours: `Mo-Su ${lib.opening_time}-${lib.closing_time}`
    } : {}),
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* BREADCRUMB + TITLE */}
      <div className="container mx-auto px-6 md:px-10 py-6 border-b border-border/50">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex gap-2 items-center text-sm text-muted-foreground mb-2">
              <Link href="/" className="hover:underline">Home</Link>
              <span>/</span>
              <Link href={`/${city}`} className="hover:underline capitalize">{city}</Link>
              <span>/</span>
              <span className="text-black font-medium">{lib.display_name}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-black">{lib.display_name}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              {lib.verification_status === "verified" && (
                <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200 font-medium text-xs">
                  <ShieldCheck className="w-3 h-3 mr-1" /> Verified
                </Badge>
              )}
              {lib.nearest_metro && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5 mr-1" />
                  {lib.nearest_metro}{walkingMins ? ` · ${walkingMins} min walk` : ""}
                </div>
              )}
              {lib.opening_time && lib.closing_time && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Clock className="w-3.5 h-3.5 mr-1" />
                  {lib.opening_time} – {lib.closing_time}
                </div>
              )}
            </div>
          </div>

          <LibraryDetailActions
            libraryId={lib.id}
            libraryName={lib.display_name}
            locality={lib.locality}
            city={lib.city}
          />
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="container mx-auto px-6 md:px-10 py-8 grid grid-cols-1 lg:grid-cols-3 gap-10">

        {/* LEFT COLUMN */}
        <div className="lg:col-span-2 space-y-10">

          <LibraryPhotoGallery images={images} libraryName={lib.display_name} />

          {/* About */}
          <section>
            {/* About & Description */}
            <h2 className="text-xl font-bold mb-4">About</h2>
            {lib.description && (
              <p className="text-muted-foreground leading-relaxed mb-6 whitespace-pre-wrap">
                {lib.description}
              </p>
            )}
            
            {/* Amenities Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm text-muted-foreground">
              {lib.total_seats && (
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-black">{lib.total_seats}</span> total seats
                </div>
              )}
              {lib.pin_code && (
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-black">PIN</span> {lib.pin_code}
                </div>
              )}
              {lib.district && (
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-black">{lib.district}</span> district
                </div>
              )}
            </div>
          </section>

          <AmenitiesGrid amenities={amenities} />

          {/* Location */}
          <section>
            <h2 className="text-xl font-bold mb-4">Location</h2>
            <Card className="overflow-hidden border-border/60">
              <CardContent className="p-0">
                {lib.latitude && lib.longitude ? (
                  <MapEmbed
                    lat={lib.latitude}
                    lng={lib.longitude}
                    name={lib.display_name}
                  />
                ) : (
                  <div className="w-full h-52 bg-muted flex items-center justify-center border-b border-border/40">
                    <div className="text-center">
                      <Navigation className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                      <p className="text-sm text-muted-foreground">No location data</p>
                    </div>
                  </div>
                )}
                <div className="p-5 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                  <div>
                    <p className="text-sm font-medium">{lib.full_address ?? lib.formatted_address}</p>
                    {lib.locality && (
                      <p className="text-sm text-muted-foreground mt-0.5">{lib.locality}, {lib.city}</p>
                    )}
                  </div>
                  {lib.map_link && (
                    <a href={lib.map_link} target="_blank" rel="noopener noreferrer">
                      <Button className="shrink-0 font-semibold">
                        Get Directions <ExternalLink className="w-4 h-4 ml-1.5" />
                      </Button>
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          </section>
        </div>

        {/* SIDEBAR */}
        <div>
          <Card className="sticky top-28 border border-border/80 shadow-sm rounded-2xl overflow-hidden">
            <CardContent className="p-6">
              <FeePlansList feePlans={feePlans} />
              <EnquiryForm
                libraryBranchId={lib.id}
                phoneNumber={lib.phone_number}
                sourcePage={`/${city}/library/${slug}`}
              />
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
