import { MetadataRoute } from 'next'
import prisma from "@/lib/prisma"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.focusdesk.in';

  const routes = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/libraries`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
  ];

  const libraries = await prisma.library.findMany({
    where: { kycStatus: 'APPROVED' },
    select: { id: true, city: true, locality: true, updatedAt: true }
  });

  const libraryRoutes = libraries.map((lib: any) => ({
    url: `${baseUrl}/library/${lib.id}`,
    lastModified: lib.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const uniqueCities = [...new Set(libraries.map((lib: any) => lib.city?.toLowerCase()).filter(Boolean))];
  const cityRoutes = uniqueCities.map(city => ({
    url: `${baseUrl}/${encodeURIComponent(city as string)}/libraries`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.9,
  }));

  const uniqueLocalities = new Set<string>();
  libraries.forEach((lib: any) => {
    if (lib.city && lib.locality) {
      uniqueLocalities.add(`${lib.city.toLowerCase()}|${lib.locality.toLowerCase()}`);
    }
  });

  const localityRoutes = Array.from(uniqueLocalities).map(composite => {
    const [city, locality] = composite.split('|');
    return {
      url: `${baseUrl}/${encodeURIComponent(city)}/libraries/${encodeURIComponent(locality)}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    };
  });

  return [...routes, ...cityRoutes, ...localityRoutes, ...libraryRoutes];
}
