"use server";

import { supabaseServer } from "@/lib/supabase-server";
import {
  runLibraryCardQuery,
  withCardImages,
} from "@/lib/library-card-data";

export async function getSavedLibraries(ids: string[]) {
  if (!ids || ids.length === 0) return [];

  const data = await runLibraryCardQuery((selectClause) =>
    supabaseServer
      .from("library_branches")
      .select(selectClause)
      .in("id", ids),
  );

  const librariesWithImages = await withCardImages(data);
  const libraryById = new Map(librariesWithImages.map((library) => [library.id, library]));

  return ids
    .map((id) => libraryById.get(id))
    .filter((library): library is NonNullable<typeof library> => Boolean(library));
}
