import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "edge";
export const revalidate = 0;

export interface Suggestion {
  type: "library" | "locality" | "metro";
  label: string;
  slug: string;
  city: string;
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  // Call the search_suggestions RPC
  const { data, error } = await supabaseServer.rpc("search_suggestions" as never, {
    query_term: q,
  } as never);

  if (error) {
    console.error("Suggestions error:", error.message);
    // Fallback: simple ilike on display_name
    const { data: fallback } = await supabaseServer
      .from("library_branches")
      .select("id, slug, city, display_name, locality")
      .or(`display_name.ilike.%${q}%,locality.ilike.%${q}%`)
      .limit(5);

    const suggestions: Suggestion[] = (fallback ?? []).map((r) => ({
      type: "library",
      label: r.display_name,
      slug: r.slug,
      city: r.city,
    }));
    return NextResponse.json({ suggestions });
  }

  return NextResponse.json({ suggestions: data ?? [] });
}
