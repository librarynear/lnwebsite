"use server";

import { supabaseServer } from "@/lib/supabase-server";
import { getLibraryCoverImageMap } from "@/lib/library-images";

export async function getSavedLibraries(ids: string[]) {
  if (!ids || ids.length === 0) return [];

  const { data, error } = await supabaseServer
    .from("library_branches")
    .select("id, slug, city, display_name, locality, nearest_metro, nearest_metro_distance_km, verification_status")
    .in("id", ids);

  if (error) {
    console.error("Error fetching saved libraries:", error);
    return [];
  }

  const libraries = data ?? [];
  const coverImageMap = await getLibraryCoverImageMap(libraries.map((library) => library.id));

  return libraries.map((library) => ({
    ...library,
    coverImageUrl: coverImageMap[library.id] ?? null,
  }));
}
