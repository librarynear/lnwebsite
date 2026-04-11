import { supabaseServer } from "@/lib/supabase-server";
import type { Tables } from "@/types/supabase";

type LibraryImage = Tables<"library_images">;
type ImageVariant = "card" | "detailHero" | "detailThumb";

const IMAGEKIT_TRANSFORMS: Record<ImageVariant, string> = {
  card: "tr=w-720,h-720,c-at_max,f-auto,q-72",
  detailHero: "tr=w-1400,h-1400,c-at_max,f-auto,q-78",
  detailThumb: "tr=w-900,h-900,c-at_max,f-auto,q-75",
};

export function getOptimizedImageUrl(url: string | null | undefined, variant: ImageVariant = "card"): string | null {
  if (!url) return null;

  const transform = IMAGEKIT_TRANSFORMS[variant];
  if (!transform) return url;

  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}${transform}`;
}

function compareLibraryImages(a: Partial<LibraryImage>, b: Partial<LibraryImage>): number {
  const coverRankA = a.is_cover ? 0 : 1;
  const coverRankB = b.is_cover ? 0 : 1;
  if (coverRankA !== coverRankB) return coverRankA - coverRankB;

  const sortOrderA = a.sort_order ?? Number.MAX_SAFE_INTEGER;
  const sortOrderB = b.sort_order ?? Number.MAX_SAFE_INTEGER;
  if (sortOrderA !== sortOrderB) return sortOrderA - sortOrderB;

  const createdAtA = a.created_at ?? "";
  const createdAtB = b.created_at ?? "";
  return createdAtA.localeCompare(createdAtB);
}

export async function getLibraryCoverImageMap(
  libraryIds: string[],
): Promise<Record<string, string>> {
  const uniqueIds = [...new Set(libraryIds.filter(Boolean))];
  if (uniqueIds.length === 0) return {};

  const { data, error } = await supabaseServer
    .from("library_images")
    .select("library_branch_id,imagekit_url,is_cover,sort_order,created_at")
    .in("library_branch_id", uniqueIds);

  if (error || !data) {
    console.error("Failed to fetch library cover images:", error?.message);
    return {};
  }

  const rows = [...data].sort(compareLibraryImages);
  const coverMap: Record<string, string> = {};

  for (const row of rows) {
    if (!row.library_branch_id || !row.imagekit_url || coverMap[row.library_branch_id]) {
      continue;
    }
    coverMap[row.library_branch_id] = row.imagekit_url;
  }

  return coverMap;
}
