import "server-only";

import { revalidatePath, revalidateTag } from "next/cache";
import { supabaseServer } from "@/lib/supabase-server";

type LibraryCacheTarget = {
  city: string;
  slug: string;
  locality: string | null;
};

function localityToSlug(locality: string) {
  return locality.trim().toLowerCase().replace(/\s+/g, "-");
}

export async function getLibraryCacheTarget(id: string): Promise<LibraryCacheTarget | null> {
  const { data, error } = await supabaseServer
    .from("library_branches")
    .select("city, slug, locality")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Failed to load library cache target:", error.message);
    return null;
  }

  return data ?? null;
}

export function revalidateLibraryContent(target?: LibraryCacheTarget | null) {
  revalidateTag("library-cards", "max");
  revalidateTag("library-search-results", "max");
  revalidateTag("library-localities", "max");
  revalidateTag("zero-result-suggestions", "max");
  revalidateTag("home-top-localities", "max");

  revalidatePath("/");
  revalidatePath("/admin/libraries");

  if (!target) {
    return;
  }

  const city = target.city.toLowerCase();

  revalidatePath(`/${city}`);
  revalidatePath(`/${city}/libraries`);
  revalidatePath(`/${city}/library/${target.slug}`);

  if (target.locality) {
    revalidatePath(`/${city}/locality/${localityToSlug(target.locality)}`);
  }
}
