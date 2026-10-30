import { supabaseServer } from "@/lib/supabase-server";
import { getSiteUrl } from "@/lib/site-url";
import type { MetadataRoute } from "next";
import { client } from "@/sanity/lib/client";

export const revalidate = 86400; // Cache for 24h at the edge so Googlebot gets instant responses

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();

  // Static routes
  const statics: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/blog`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/contact`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/for-owners`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/directory`, changeFrequency: "daily", priority: 0.9 },
  ];

  // Fetch ALL libraries by paginating (bypassing PostgREST max-rows 1000 limit)
  let branchData: any[] = [];
  const pageSize = 1000;
  let page = 0;
  
  while (true) {
    const { data } = await supabaseServer
      .from("library_branches")
      .select("slug, city, locality, nearest_metro, amenities_text, updated_at, pin_code")
      .eq("is_active", true)
      .range(page * pageSize, (page + 1) * pageSize - 1);
      
    if (!data || data.length === 0) break;
    branchData.push(...data);
    if (data.length < pageSize) break;
    page++;
  }

  const uniqueCities = [...new Set(branchData.map((row) => row.city.toLowerCase()))];

  const cityPages: MetadataRoute.Sitemap = uniqueCities.flatMap((city) => [
    { url: `${base}/${city}`, changeFrequency: "weekly", priority: 0.85 },
    { url: `${base}/${city}/libraries`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/${city}/24-hour-libraries`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/${city}/top-10-libraries`, changeFrequency: "weekly", priority: 0.9 },
  ]);

  const libraryPages: MetadataRoute.Sitemap = branchData.map((b) => ({
    url: `${base}/${b.city.toLowerCase()}/library/${b.slug}`,
    lastModified: b.updated_at ? new Date(b.updated_at) : new Date(),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  // Locality pages
  const uniqueLocalities = [
    ...new Set(
      branchData
        .filter((row) => row.locality)
        .map((row) => `${row.city.toLowerCase()}::${row.locality!.toLowerCase().replace(/\s+/g, "-")}`)
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

  // Metro pages
  const uniqueMetros = [
    ...new Set(
      branchData
        .filter((row) => row.nearest_metro)
        .map((row) => `${row.city.toLowerCase()}::${row.nearest_metro!.toLowerCase().replace(/\s+/g, "-")}`)
    ),
  ];

  const metroPages: MetadataRoute.Sitemap = uniqueMetros.map((entry) => {
    const [city, metroSlug] = entry.split("::");
    return {
      url: `${base}/${city}/metro/${encodeURIComponent(metroSlug)}`,
      changeFrequency: "weekly",
      priority: 0.6,
    };
  });

  // Amenity pages
  const amenityLocalitySet = new Set<string>();
  branchData.forEach((row) => {
    if (!row.amenities_text) return;
    const amenities = row.amenities_text.split(",").map((a: string) => a.trim().toLowerCase()).filter(Boolean);
    amenities.forEach((amenity: string) => {
      const aSlug = amenity.replace(/\s+/g, "-");
      const city = row.city.toLowerCase();
      amenityLocalitySet.add(`${city}::${aSlug}::NONE`);
      if (row.locality) {
        const lSlug = row.locality.toLowerCase().replace(/\s+/g, "-");
        amenityLocalitySet.add(`${city}::${aSlug}::${lSlug}`);
      }
    });
  });

  const amenityPages: MetadataRoute.Sitemap = Array.from(amenityLocalitySet).map((entry) => {
    const [city, aSlug, lSlug] = entry.split("::");
    if (lSlug === "NONE") {
      return {
        url: `${base}/${city}/amenity/${encodeURIComponent(aSlug)}`,
        changeFrequency: "weekly",
        priority: 0.6,
      };
    } else {
      return {
        url: `${base}/${city}/amenity/${encodeURIComponent(aSlug)}/locality/${encodeURIComponent(lSlug)}`,
        changeFrequency: "weekly",
        priority: 0.5,
      };
    }
  });

  // Blog pages
  const posts = await client.fetch(
    `*[_type == "post" && defined(slug.current)] { slug, _updatedAt, publishedAt }`
  );
  
  const blogPages: MetadataRoute.Sitemap = posts.map((post: any) => ({
    url: `${base}/blog/${post.slug.current}`,
    lastModified: new Date(post.publishedAt || post._updatedAt),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  // Pincode pages
  const uniquePincodes = [
    ...new Set(
      branchData
        .filter((row) => row.pin_code)
        .map((row) => `${row.city.toLowerCase()}::${row.pin_code}`)
    ),
  ];

  const pincodePages: MetadataRoute.Sitemap = uniquePincodes.map((entry) => {
    const [city, pincode] = entry.split("::");
    return {
      url: `${base}/${city}/pincode/${pincode}`,
      changeFrequency: "weekly",
      priority: 0.6,
    };
  });

  // Top 10 Locality pages
  const top10LocalityPages: MetadataRoute.Sitemap = uniqueLocalities.map((entry) => {
    const [city, localitySlug] = entry.split("::");
    return {
      url: `${base}/${city}/top-10/locality/${encodeURIComponent(localitySlug)}`,
      changeFrequency: "weekly",
      priority: 0.7,
    };
  });

  // Exam Pages (Static list of exams applied to cities and localities)
  const popularExams = ["upsc", "neet", "jee", "ssc", "bank-po"];
  
  const examCityPages: MetadataRoute.Sitemap = uniqueCities.flatMap((city) => 
    popularExams.map((exam) => ({
      url: `${base}/${city}/exam/${exam}`,
      changeFrequency: "weekly",
      priority: 0.7,
    }))
  );

  const examLocalityPages: MetadataRoute.Sitemap = uniqueLocalities.flatMap((entry) => {
    const [city, localitySlug] = entry.split("::");
    return popularExams.map((exam) => ({
      url: `${base}/${city}/exam/${exam}/locality/${encodeURIComponent(localitySlug)}`,
      changeFrequency: "weekly",
      priority: 0.6,
    }));
  });

  return [
    ...statics, 
    ...cityPages, 
    ...libraryPages, 
    ...localityPages, 
    ...metroPages, 
    ...amenityPages, 
    ...blogPages,
    ...pincodePages,
    ...top10LocalityPages,
    ...examCityPages,
    ...examLocalityPages
  ];
}
