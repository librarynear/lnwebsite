import { supabaseServer } from "@/lib/supabase-server";
import { getSiteUrl } from "@/lib/site-url";
import type { MetadataRoute } from "next";

export const revalidate = 86400; // Regenerate once per day

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();

  // Static routes
  const statics: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/delhi`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/delhi/libraries`, changeFrequency: "daily", priority: 0.9 },
  ];

  // All library detail pages
  const { data: branches } = await supabaseServer
    .from("library_branches")
    .select("slug, city, updated_at")
    .eq("is_active", true);

  const libraryPages: MetadataRoute.Sitemap = (branches ?? []).map((b) => ({
    url: `${base}/${b.city.toLowerCase()}/library/${b.slug}`,
    lastModified: b.updated_at ? new Date(b.updated_at) : new Date(),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  // Locality pages
  const { data: localityData } = await supabaseServer
    .from("library_branches")
    .select("locality")
    .eq("is_active", true)
    .not("locality", "is", null);

  const uniqueLocalities = [
    ...new Set((localityData ?? []).map((r) => r.locality).filter(Boolean)),
  ];

  const localityPages: MetadataRoute.Sitemap = uniqueLocalities.map((loc) => ({
    url: `${base}/delhi/locality/${encodeURIComponent(loc!.toLowerCase().replace(/\s+/g, "-"))}`,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...statics, ...libraryPages, ...localityPages];
}
