import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { logPerf, measureAsync, toServerTiming } from "@/lib/perf";

export const runtime = "edge";
export const revalidate = 0;

export interface Suggestion {
  type: "library" | "locality" | "metro" | "nearby";
  label: string;
  slug: string;
  city: string;
  distance_km?: number | null;
}

type FallbackSuggestionRow = {
  slug: string;
  city: string;
  display_name: string;
  locality: string | null;
  verification_status: string | null;
  profile_completeness_score: number | null;
};

function getFallbackSuggestionScore(row: FallbackSuggestionRow, normalizedQuery: string) {
  const display = row.display_name.toLowerCase();
  const locality = row.locality?.toLowerCase() ?? "";

  return (
    (display === normalizedQuery ? 4 : 0) +
    (display.startsWith(normalizedQuery) ? 2.6 : 0) +
    (display.includes(normalizedQuery) ? 1.2 : 0) +
    (locality === normalizedQuery ? 1.6 : 0) +
    (locality.startsWith(normalizedQuery) ? 0.9 : 0) +
    (row.verification_status === "verified" ? 0.2 : 0) +
    ((row.profile_completeness_score ?? 0) / 100) * 0.08
  );
}

function isMissingSuggestionFastPath(errorMessage: string) {
  return /Could not find the function public\.search_suggestions/i.test(errorMessage);
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const city = req.nextUrl.searchParams.get("city")?.trim().toLowerCase() ?? "";
  const lat = Number(req.nextUrl.searchParams.get("lat"));
  const lng = Number(req.nextUrl.searchParams.get("lng"));
  const hasCoordinates = Number.isFinite(lat) && Number.isFinite(lng);

  if (!hasCoordinates && q.length < 2) {
    return NextResponse.json({ suggestions: [], mode: "text" });
  }

  const totalStart = performance.now();
  if (hasCoordinates && q.length < 2) {
    const { result: nearbyResponse, metric: nearbyMetric } = await measureAsync(
      "nearby",
      () =>
        supabaseServer.rpc("nearby_library_suggestions" as never, {
          user_lat: lat,
          user_lng: lng,
          city_filter: city || null,
          max_results: 10,
        } as never),
    );

    const nearbySuggestions = ((nearbyResponse.data ?? []) as Suggestion[]).filter((suggestion) => {
      if (!city) return true;
      return suggestion.city?.toLowerCase() === city;
    });

    const totalMetric = {
      name: "total",
      duration: performance.now() - totalStart,
    };
    const metrics = [nearbyMetric, totalMetric];
    logPerf(
      "suggestions",
      metrics,
      `mode=nearby city="${city || "all"}" count=${nearbySuggestions.length}`,
    );

    return NextResponse.json(
      { suggestions: nearbySuggestions, mode: "nearby" },
      {
        headers: {
          "Server-Timing": toServerTiming(metrics),
        },
      },
    );
  }

  const { result: rpcResponse, metric: rpcMetric } = await measureAsync(
    "rpc",
    () =>
      supabaseServer.rpc("search_suggestions" as never, {
        query_term: q,
        city_filter: city || null,
        max_results: 10,
      } as never),
  );

  let data = rpcResponse.data;
  let error = rpcResponse.error;
  let usedLegacyRpc = false;

  if (error && isMissingSuggestionFastPath(error.message)) {
    const { result: legacyResponse, metric: legacyMetric } = await measureAsync(
      "legacyRpc",
      () =>
        supabaseServer.rpc("search_suggestions" as never, {
          query_term: q,
        } as never),
    );

    data = legacyResponse.data;
    error = legacyResponse.error;
    usedLegacyRpc = !legacyResponse.error;

    if (!legacyResponse.error) {
      const suggestions = ((legacyResponse.data ?? []) as Suggestion[]).filter((suggestion) => {
        if (!city) return true;
        return suggestion.city?.toLowerCase() === city;
      });

      const totalMetric = {
        name: "total",
        duration: performance.now() - totalStart,
      };
      const metrics = [rpcMetric, legacyMetric, totalMetric];
      logPerf(
        "suggestions",
        metrics,
        `q="${q}" city="${city || "all"}" legacyRpc=1 count=${suggestions.length}`,
      );

      return NextResponse.json(
        { suggestions, mode: "text" },
        {
          headers: {
            "Server-Timing": toServerTiming(metrics),
          },
        },
      );
    }
  }

  if (error) {
    console.error("Suggestions error:", error.message);
    const { result: fallbackResponse, metric: fallbackMetric } = await measureAsync(
      "fallback",
      () => {
        let fallbackQuery = supabaseServer
          .from("library_branches")
          .select("slug, city, display_name, locality, verification_status, profile_completeness_score")
          .eq("is_active", true)
          .or(`display_name.ilike.%${q}%,locality.ilike.%${q}%`)
          .limit(20);

        if (city) {
          fallbackQuery = fallbackQuery.ilike("city", city);
        }

        return fallbackQuery;
      },
    );
    const fallback = (fallbackResponse.data ?? []) as FallbackSuggestionRow[];
    const normalizedQuery = q.toLowerCase();

    const suggestions: Suggestion[] = fallback
      .sort((a, b) => {
        const scoreDelta =
          getFallbackSuggestionScore(b, normalizedQuery) - getFallbackSuggestionScore(a, normalizedQuery);
        if (scoreDelta !== 0) return scoreDelta;
        return a.display_name.localeCompare(b.display_name);
      })
      .slice(0, 10)
      .map((r) => ({
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
    logPerf(
      "suggestions",
      metrics,
      `q="${q}" city="${city || "all"}" fallback=1${usedLegacyRpc ? " legacyRpc=1" : ""}`,
    );

    return NextResponse.json(
      { suggestions, mode: "text" },
      {
        headers: {
          "Server-Timing": toServerTiming(metrics),
        },
      },
    );
  }

  const suggestions = (data ?? []) as Suggestion[];
  const totalMetric = {
    name: "total",
    duration: performance.now() - totalStart,
  };
  const metrics = [rpcMetric, totalMetric];
  logPerf("suggestions", metrics, `q="${q}" city="${city || "all"}" fallback=0 count=${suggestions.length}`);

  return NextResponse.json(
    { suggestions, mode: "text" },
    {
      headers: {
        "Server-Timing": toServerTiming(metrics),
      },
    },
  );
}
