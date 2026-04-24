import { supabaseServer } from "@/lib/supabase-server";
import { getSiteUrl } from "@/lib/site-url";
import type { MetadataRoute } from "next";

export const revalidate = 86400; // Regenerate once per day

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();

  // Static routes
  const statics: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/contact`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/for-owners`, changeFrequency: "weekly", priority: 0.7 },
  ];

  // All library detail pages
  const { data: branches } = await supabaseServer
    .from("library_branches")
    .select("slug, city, locality, updated_at")
    .eq("is_active", true);

  const uniqueCities = [...new Set((branches ?? []).map((row) => row.city.toLowerCase()))];

  const cityPages: MetadataRoute.Sitemap = uniqueCities.flatMap((city) => [
    { url: `${base}/${city}`, changeFrequency: "weekly", priority: 0.85 },
    { url: `${base}/${city}/libraries`, changeFrequency: "daily", priority: 0.9 },
  ]);

  const libraryPages: MetadataRoute.Sitemap = (branches ?? []).map((b) => ({
    url: `${base}/${b.city.toLowerCase()}/library/${b.slug}`,
    lastModified: b.updated_at ? new Date(b.updated_at) : new Date(),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  // Locality pages
  const uniqueLocalities = [
    ...new Set(
      (branches ?? [])
        .filter((row) => row.locality)
        .map((row) => `${row.city.toLowerCase()}::${row.locality!.toLowerCase().replace(/\s+/g, "-")}`),
    ),
  ];

  const localityPages: MetadataRoute.Sitemap = uniqueLocalities.map((entry) => {
    const [city, localitySlug] = entry.split("::");
    return {
      url: `${base}/${city}/locality/${encodeURIComponent(localitySlug)}`,
      changeFrequency: "weekly",
      priority: 0.7,
    };
  });

  return [...statics, ...cityPages, ...libraryPages, ...localityPages];
}
