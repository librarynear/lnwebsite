import "server-only";

import { supabaseServer } from "@/lib/supabase-server";
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
  sort?: string;
  page?: number;
  allowedLocalities?: string[];
};

export async function getLibraryOpsPage({
  q,
  city,
  locality,
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
    .select("*, library_fee_plans(*), library_images(*)", { count: "exact" });

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

  if (sort === "score_asc") {
    query = query.order("profile_completeness_score", { ascending: true });
  } else if (sort === "name_asc") {
    query = query.order("display_name", { ascending: true });
  } else if (sort === "recent") {
    query = query.order("updated_at", { ascending: false });
  } else {
    query = query.order("profile_completeness_score", { ascending: false });
  }

  const { data, count, error } = await query.range(from, to);

  return {
    libraries: (data ?? []) as AdminLibraryBranch[],
    totalCount: count ?? 0,
    pageSize,
    error,
  };
}
