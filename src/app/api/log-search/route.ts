import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";

export const revalidate = 0;

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const rateCheck = checkRateLimit(ip, RATE_LIMITS.logSearch);
  if (!rateCheck.success) {
    return NextResponse.json(
      { ok: false, error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rateCheck.resetAt - Date.now()) / 1000)) } },
    );
  }

  try {
    const body = await req.json();
    const { query, result_count, city, session_id } = body;
    if (!query || typeof query !== "string") return NextResponse.json({ ok: false });
    if (query.length > 500) return NextResponse.json({ ok: false });
    if (session_id && (typeof session_id !== "string" || session_id.length > 128)) {
      return NextResponse.json({ ok: false });
    }
    if (city && (typeof city !== "string" || city.length > 100)) {
      return NextResponse.json({ ok: false });
    }

    await supabaseServer.from("search_events" as never).insert({
      query: query.slice(0, 500),
      result_count: typeof result_count === "number" ? Math.max(0, Math.min(result_count, 10000)) : 0,
      city: typeof city === "string" ? city.slice(0, 100) : null,
      session_id: typeof session_id === "string" ? session_id.slice(0, 128) : null,
    } as never);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
