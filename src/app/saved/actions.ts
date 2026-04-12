"use server";

import { supabaseServer } from "@/lib/supabase-server";
import {
  runLibraryCardQuery,
  withCardImages,
} from "@/lib/library-card-data";
import { logPerf, measureAsync } from "@/lib/perf";

export async function getSavedLibraries(ids: string[]) {
  if (!ids || ids.length === 0) return [];

  const queryMeasurement = await measureAsync("savedLibrariesQuery", () =>
    runLibraryCardQuery((selectClause) =>
      supabaseServer
        .from("library_branches")
        .select(selectClause)
        .in("id", ids),
    ),
  );

  const imageMeasurement = await measureAsync("savedLibraryImages", () =>
    withCardImages(queryMeasurement.result),
  );
  const librariesWithImages = imageMeasurement.result;
  const libraryById = new Map(librariesWithImages.map((library) => [library.id, library]));
  logPerf("savedLibraries", [queryMeasurement.metric, imageMeasurement.metric], `ids=${ids.length} count=${librariesWithImages.length}`);

  return ids
    .map((id) => libraryById.get(id))
    .filter((library): library is NonNullable<typeof library> => Boolean(library));
}
