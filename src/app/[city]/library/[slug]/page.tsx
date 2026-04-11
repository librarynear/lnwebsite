import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { MapPin, Clock, ShieldCheck, Share2, Heart, ExternalLink, Navigation } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabaseServer } from "@/lib/supabase-server";
import { EnquiryForm } from "@/components/enquiry-form";
import type { Tables } from "@/types/supabase";
import type { Metadata } from "next";
import { FeePlansList } from "@/components/fee-plans-list";
import { AmenitiesGrid } from "@/components/amenities-grid";
import { MapEmbed } from "@/components/map-embed";

type LibraryBranch = Tables<"library_branches">;
type FeePlan = Tables<"library_fee_plans">;

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
  return (data ?? []).map((b) => ({ city: b.city.toLowerCase(), slug: b.slug }));
}

export const revalidate = 3600; // Re-generate every hour if data changes

async function getLibrary(slug: string): Promise<LibraryBranch | null> {
  const { data, error } = await supabaseServer
    .from("library_branches")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !data) return null;
  return data;
}

async function getFeePlans(libraryId: string): Promise<FeePlan[]> {
  const { data, error } = await supabaseServer
    .from("library_fee_plans")
    .select("*")
    .eq("library_branch_id", libraryId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error || !data) return [];
  return data;
}

async function getLibraryImages(libraryId: string): Promise<string[]> {
  const { data } = await supabaseServer
    .from("library_images")
    .select("imagekit_url")
    .eq("library_branch_id", libraryId)
    .order("sort_order", { ascending: true });

  return data?.map(d => d.imagekit_url) ?? [];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const lib = await getLibrary(slug);
  if (!lib) return { title: "Library Not Found" };
  return {
    title: `${lib.display_name} | StudyStash`,
    description: `Study at ${lib.display_name} in ${lib.locality ?? lib.district ?? lib.city}. ${lib.nearest_metro ? `Near ${lib.nearest_metro}.` : ""} Check fees, amenities, and directions.`,
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

  const lib = await getLibrary(slug);
  if (!lib) notFound();

  const [feePlans, images] = await Promise.all([
    getFeePlans(lib.id),
    getLibraryImages(lib.id),
  ]);
  const amenities = parseAmenities(lib.amenities_text);

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

          <div className="flex gap-2 w-full md:w-auto">
            <Button variant="outline" size="sm" className="flex-1 md:flex-none rounded-lg font-semibold">
              <Share2 className="w-4 h-4 mr-1.5" /> Share
            </Button>
            <Button variant="outline" size="sm" className="flex-1 md:flex-none rounded-lg font-semibold">
              <Heart className="w-4 h-4 mr-1.5" /> Save
            </Button>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="container mx-auto px-6 md:px-10 py-8 grid grid-cols-1 lg:grid-cols-3 gap-10">

        {/* LEFT COLUMN */}
        <div className="lg:col-span-2 space-y-10">

          {/* Photo Grid */}
          <div className="grid grid-cols-2 gap-3 h-[340px]">
            {images.length > 0 ? (
              <>
                <div className="col-span-1 row-span-2 rounded-xl overflow-hidden border border-border/40 bg-muted relative">
                  <Image
                    src={images[0]}
                    alt={`${lib.display_name} cover`}
                    fill
                    className="object-cover"
                    priority
                    sizes="(max-width: 768px) 50vw, 33vw"
                  />
                </div>
                <div className="rounded-xl overflow-hidden border border-border/40 bg-muted relative">
                  {images[1] ? (
                    <Image
                      src={images[1]}
                      alt={`${lib.display_name} photo 2`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, 20vw"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <MapPin className="h-8 w-8 text-muted-foreground/20" />
                    </div>
                  )}
                </div>
                <div className="relative rounded-xl overflow-hidden border border-border/40 bg-muted">
                  {images[2] ? (
                    <Image
                      src={images[2]}
                      alt={`${lib.display_name} photo 3`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, 20vw"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <MapPin className="h-8 w-8 text-muted-foreground/20" />
                    </div>
                  )}
                  {images.length > 3 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 text-xs font-semibold text-white">
                      +{images.length - 3} more photos
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="col-span-1 rounded-xl overflow-hidden bg-muted flex items-center justify-center border border-border/40 row-span-2">
                  <MapPin className="h-12 w-12 text-muted-foreground/20" />
                </div>
                <div className="rounded-xl overflow-hidden bg-muted flex items-center justify-center border border-border/40">
                  <MapPin className="h-8 w-8 text-muted-foreground/20" />
                </div>
                <div className="rounded-xl overflow-hidden bg-muted flex items-center justify-center border border-border/40 cursor-pointer hover:bg-muted/70 transition-colors relative group">
                  <MapPin className="h-8 w-8 text-muted-foreground/20" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/5">
                    <span className="text-xs font-semibold underline">View all photos</span>
                  </div>
                </div>
              </>
            )}
          </div>

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
