import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { logPerf, measureAsync, toServerTiming } from "@/lib/perf";

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
  const city = req.nextUrl.searchParams.get("city")?.trim().toLowerCase() ?? "";

  if (q.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  const totalStart = performance.now();
  const { result: rpcResponse, metric: rpcMetric } = await measureAsync(
    "rpc",
    () =>
      supabaseServer.rpc("search_suggestions" as never, {
        query_term: q,
      } as never),
  );
  const { data, error } = rpcResponse;

  if (error) {
    console.error("Suggestions error:", error.message);
    const { result: fallbackResponse, metric: fallbackMetric } = await measureAsync(
      "fallback",
      () => {
        let fallbackQuery = supabaseServer
          .from("library_branches")
          .select("slug, city, display_name")
          .eq("is_active", true)
          .or(`display_name.ilike.%${q}%,locality.ilike.%${q}%`)
          .limit(5);

        if (city) {
          fallbackQuery = fallbackQuery.ilike("city", city);
        }

        return fallbackQuery;
      },
    );
    const fallback = fallbackResponse.data ?? [];

    const suggestions: Suggestion[] = fallback.map((r) => ({
      type: "library",
      label: r.display_name,
      slug: r.slug,
      city: r.city,
    }));

    const totalMetric = {
      name: "total",
      duration: performance.now() - totalStart,
    };
    const metrics = [rpcMetric, fallbackMetric, totalMetric];
    logPerf("suggestions", metrics, `q="${q}" city="${city || "all"}" fallback=1`);

    return NextResponse.json(
      { suggestions },
      {
        headers: {
          "Server-Timing": toServerTiming(metrics),
        },
      },
    );
  }

  const suggestionRows = (data ?? []) as Suggestion[];
  const scopedData = suggestionRows.filter((suggestion) => {
    if (!city) return true;
    return suggestion.city?.toLowerCase() === city;
  });
  const suggestions = scopedData.slice(0, 10);
  const totalMetric = {
    name: "total",
    duration: performance.now() - totalStart,
  };
  const metrics = [rpcMetric, totalMetric];
  logPerf("suggestions", metrics, `q="${q}" city="${city || "all"}" fallback=0 count=${suggestions.length}`);

  return NextResponse.json(
    { suggestions },
    {
      headers: {
        "Server-Timing": toServerTiming(metrics),
      },
    },
  );
}
