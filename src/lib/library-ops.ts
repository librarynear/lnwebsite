import "server-only";

import { supabaseServer } from "@/lib/supabase-server";
import { calculateLibraryProfileCompleteness } from "@/lib/library-profile-score";
import type { Tables } from "@/types/supabase";

type FeePlan = Tables<"library_fee_plans">;
type LibraryImage = Tables<"library_images">;

export type AdminLibraryBranch = Tables<"library_branches"> & {
  library_fee_plans?: FeePlan[];
  library_images?: LibraryImage[];
};

export type LibraryOpsFilters = {
  q?: string;
  city?: string;
  locality?: string;
  verified?: string;
  sort?: string;
  page?: number;
  allowedLocalities?: string[];
};

export async function getLibraryOpsPage({
  q,
  city,
  locality,
  verified,
  sort,
  page = 1,
  allowedLocalities,
}: LibraryOpsFilters) {
  const pageSize = 100;
  const safePage = Math.max(1, page);
  const from = (safePage - 1) * pageSize;
  const to = from + pageSize - 1;

  if (Array.isArray(allowedLocalities) && allowedLocalities.length === 0) {
    return {
      libraries: [] as AdminLibraryBranch[],
      totalCount: 0,
      pageSize,
      error: null,
    };
  }

  let query = supabaseServer
    .from("library_branches")
    .select("*, library_fee_plans(*), library_images(*)", { count: "exact" })
    .eq("is_active", true);

  if (q) {
    query = query.or(`display_name.ilike.%${q}%,locality.ilike.%${q}%,phone_number.ilike.%${q}%`);
  }

  if (city) {
    query = query.eq("city", city);
  }

  if (locality) {
    query = query.eq("locality", locality);
  }

  if (allowedLocalities && allowedLocalities.length > 0) {
    query = query.in("locality", allowedLocalities);
  }

  if (verified === "verified") {
    query = query.eq("verification_status", "verified");
  } else if (verified === "unverified") {
    query = query.neq("verification_status", "verified");
  }

  const { data, count, error } = await query;

  const libraries = ((data ?? []) as AdminLibraryBranch[]).map((library) => ({
    ...library,
    profile_completeness_score: calculateLibraryProfileCompleteness(library),
  }));

  const sortedLibraries = [...libraries];
  if (sort === "score_asc") {
    sortedLibraries.sort(
      (a, b) =>
        (a.profile_completeness_score ?? 0) - (b.profile_completeness_score ?? 0) ||
        a.display_name.localeCompare(b.display_name),
    );
  } else if (sort === "name_asc") {
    sortedLibraries.sort((a, b) => a.display_name.localeCompare(b.display_name));
  } else if (sort === "recent") {
    sortedLibraries.sort(
      (a, b) => new Date(b.updated_at ?? 0).getTime() - new Date(a.updated_at ?? 0).getTime(),
    );
  } else {
    sortedLibraries.sort(
      (a, b) =>
        (b.profile_completeness_score ?? 0) - (a.profile_completeness_score ?? 0) ||
        a.display_name.localeCompare(b.display_name),
    );
  }

  const paginatedLibraries = sortedLibraries.slice(from, to + 1);

  return {
    libraries: paginatedLibraries,
    totalCount: count ?? sortedLibraries.length,
    pageSize,
    error,
  };
}
