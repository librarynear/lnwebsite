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
    hours_per_day,
    base_price,
    discount_percentage,
    discounted_price,
    plan_category,
    offer_name,
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

export const revalidate = 300;

function formatTimeLabel(value: string | null | undefined) {
  if (!value) return null;

  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return value;
  }

  const period = hours >= 12 ? "PM" : "AM";
  const normalizedHours = hours % 12 || 12;
  return `${normalizedHours}:${String(minutes).padStart(2, "0")} ${period}`;
}

function formatCurrency(value: number | null | undefined, currency = "INR") {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function getStartingPrice(feePlans: FeePlan[]) {
  const prices = feePlans
    .map((plan) => plan.discounted_price ?? plan.price)
    .filter((value): value is number => typeof value === "number" && !Number.isNaN(value));

  if (prices.length === 0) return null;
  return Math.min(...prices);
}

function buildLibraryDescription(lib: LibraryDetailData, feePlans: FeePlan[], amenities: string[]) {
  const locationParts = [lib.locality, lib.district, lib.city].filter(Boolean);
  const locationLabel = locationParts.join(", ");
  const openingLabel = formatTimeLabel(lib.opening_time);
  const closingLabel = formatTimeLabel(lib.closing_time);
  const startingPrice = getStartingPrice(feePlans);
  const priceLabel = formatCurrency(startingPrice, feePlans[0]?.currency ?? "INR");
  const amenityHighlights = amenities.slice(0, 4).join(", ");

  const parts = [
    `${lib.display_name} is a study library in ${locationLabel || lib.city}.`,
    lib.nearest_metro
      ? lib.nearest_metro_distance_km
        ? `It is around ${lib.nearest_metro_distance_km} km from ${lib.nearest_metro} metro station.`
        : `It is located near ${lib.nearest_metro} metro station.`
      : null,
    openingLabel && closingLabel
      ? `Typical operating hours are from ${openingLabel} to ${closingLabel}.`
      : null,
    lib.total_seats ? `The library lists ${lib.total_seats} seats for students.` : null,
    priceLabel ? `Plans start from ${priceLabel}.` : null,
    amenityHighlights ? `Common amenities include ${amenityHighlights}.` : null,
  ];

  return parts.filter(Boolean).join(" ");
}

function buildMetadataDescription(lib: LibraryDetailData, feePlans: FeePlan[]) {
  const startingPrice = getStartingPrice(feePlans);
  const priceLabel = formatCurrency(startingPrice, feePlans[0]?.currency ?? "INR");

  return [
    `Study at ${lib.display_name}`,
    lib.locality ?? lib.district ?? lib.city,
    lib.nearest_metro ? `Near ${lib.nearest_metro}` : null,
    priceLabel ? `Plans from ${priceLabel}` : null,
    "See photos, fees, amenities, and directions.",
  ]
    .filter(Boolean)
    .join(". ");
}

function buildFeatureHighlights(lib: LibraryDetailData, feePlans: FeePlan[], amenities: string[]) {
  const openingLabel = formatTimeLabel(lib.opening_time);
  const closingLabel = formatTimeLabel(lib.closing_time);
  const startingPrice = getStartingPrice(feePlans);
  const priceLabel = formatCurrency(startingPrice, feePlans[0]?.currency ?? "INR");

  return [
    lib.nearest_metro
      ? lib.nearest_metro_distance_km
        ? `Located about ${lib.nearest_metro_distance_km} km from ${lib.nearest_metro} metro station.`
        : `Located near ${lib.nearest_metro} metro station.`
      : null,
    openingLabel && closingLabel
      ? `Operating hours are listed from ${openingLabel} to ${closingLabel}.`
      : null,
    lib.total_seats ? `This listing mentions ${lib.total_seats} total seats.` : null,
    priceLabel ? `The current price range starts from ${priceLabel}.` : null,
    amenities.length ? `Amenities highlighted include ${amenities.slice(0, 5).join(", ")}.` : null,
  ].filter(Boolean) as string[];
}

function buildComparisonTips(lib: LibraryDetailData, feePlans: FeePlan[]) {
  const hasReservedPlan = feePlans.some((plan) => plan.seat_type === "reserved");
  const hasOffers = feePlans.some((plan) => plan.plan_category === "offer");

  return [
    `Compare ${lib.display_name} with nearby libraries by checking commute time from ${lib.nearest_metro ?? "your nearest metro"}, daily study hours, and the overall environment for focused study.`,
    hasReservedPlan
      ? "This listing includes reserved seating options, which can matter if you want a fixed seat every day."
      : "Check whether you prefer reserved or flexible seating when comparing this library with other options nearby.",
    hasOffers
      ? "Review both regular plans and offer-based pricing so you understand the actual monthly cost before you choose."
      : "Look at the total monthly cost, seating comfort, and amenities together instead of comparing on price alone.",
  ];
}

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
    revalidate: 300,
    tags: ["library-detail", "library-cards"],
  },
);

const getLibraryDetailForRoute =
  process.env.NODE_ENV === "development" ? getLibraryDetailData : getCachedLibraryDetailData;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { city, slug } = await params;
  const lib = await getLibraryDetailForRoute(slug);
  if (!lib) return { title: "Library Not Found" };
  const feePlans = lib.library_fee_plans ?? [];
  const amenities = parseAmenities(lib.amenities_text);

  const siteUrl = getSiteUrl();
  const pageUrl = `${siteUrl}/${city}/library/${slug}`;
  const previewImage =
    (lib.library_images?.[0]?.imagekit_url
      ? getOptimizedImageUrl(lib.library_images[0].imagekit_url, "detailHero")
      : null) || `${siteUrl}/logo.png`;
  const previewTitle = `${lib.display_name}${lib.locality ? `, ${lib.locality}` : ""} | LibraryNear`;
  const previewDescription = buildMetadataDescription(lib, feePlans);
  const keywords = [
    lib.display_name,
    lib.locality,
    lib.city,
    lib.nearest_metro ? `${lib.nearest_metro} metro` : null,
    "study library",
    "reading room",
    ...(amenities.slice(0, 4)),
  ].filter(Boolean) as string[];

  return {
    title: previewTitle,
    description: previewDescription,
    keywords,
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
  const fallbackDescription = buildLibraryDescription(lib, feePlans, amenities);
  const featureHighlights = buildFeatureHighlights(lib, feePlans, amenities);
  const comparisonTips = buildComparisonTips(lib, feePlans);
  logPerf(
    "libraryDetail",
    [libraryMeasurement.metric],
    `slug="${slug}" city="${city}" images=${images.length} feePlans=${feePlans.length}`,
  );

  const walkingMins = lib.nearest_metro_distance_km
    ? Math.round(lib.nearest_metro_distance_km * 12)
    : null;
  const siteUrl = getSiteUrl();
  const pageUrl = `${siteUrl}/${city}/library/${slug}`;
  const librarySchema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: lib.display_name,
    url: pageUrl,
    description: lib.description || fallbackDescription,
    image: images.slice(0, 6),
    address: {
      "@type": "PostalAddress",
      streetAddress: lib.full_address ?? lib.formatted_address,
      addressLocality: lib.locality ?? lib.district,
      addressRegion: lib.state ?? "Delhi",
      postalCode: lib.pin_code,
      addressCountry: "IN",
    },
    areaServed: {
      "@type": "City",
      name: lib.city,
    },
    ...(lib.latitude && lib.longitude
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: lib.latitude,
            longitude: lib.longitude,
          },
        }
      : {}),
    ...(lib.phone_number ? { telephone: lib.phone_number } : {}),
    ...(lib.opening_time && lib.closing_time
      ? {
          openingHours: `Mo-Su ${lib.opening_time}-${lib.closing_time}`,
        }
      : {}),
    ...(feePlans.length
      ? {
          makesOffer: feePlans.slice(0, 8).map((plan) => ({
            "@type": "Offer",
            priceCurrency: plan.currency || "INR",
            price: plan.price,
            name: plan.plan_name,
            description: plan.description || plan.duration_label || undefined,
            availability: "https://schema.org/InStock",
          })),
        }
      : {}),
  };
  const breadcrumbSchema = {
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
        name: city.charAt(0).toUpperCase() + city.slice(1),
        item: `${siteUrl}/${city}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: lib.display_name,
        item: pageUrl,
      },
    ],
  };
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `Where is ${lib.display_name} located?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: lib.full_address ?? lib.formatted_address ?? `${lib.locality ?? lib.city}, ${lib.city}`,
        },
      },
      {
        "@type": "Question",
        name: `How can I compare ${lib.display_name} with other libraries nearby?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Compare metro distance, timings, amenities, study environment, seat availability, and fees before choosing ${lib.display_name}.`,
        },
      },
    ],
  };
  const jsonLd = [librarySchema, breadcrumbSchema, faqSchema];

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
            <h2 className="text-xl font-bold mb-4">About</h2>
            {lib.description ? (
              <p className="text-muted-foreground leading-relaxed mb-6 whitespace-pre-wrap">
                {lib.description}
              </p>
            ) : (
              <p className="text-muted-foreground leading-relaxed mb-6">
                {fallbackDescription}
              </p>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm text-muted-foreground">
              {lib.total_seats && (
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-black">{lib.total_seats}</span> total seats
                </div>
              )}
            </div>
          </section>

          {featureHighlights.length > 0 ? (
            <section className="rounded-3xl border border-border/70 bg-slate-50/40 p-6">
              <h2 className="text-xl font-bold text-black">Library highlights</h2>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-muted-foreground">
                {featureHighlights.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}

          <AmenitiesGrid amenities={amenities} />

          <section className="rounded-3xl border border-border/70 bg-slate-50/40 p-6">
            <h2 className="text-xl font-bold text-black">What to compare before you choose</h2>
            <div className="mt-3 space-y-4 text-sm leading-7 text-muted-foreground">
              {comparisonTips.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          </section>

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
