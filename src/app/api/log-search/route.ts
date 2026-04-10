import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, result_count, city, session_id } = body;
    if (!query) return NextResponse.json({ ok: false });

    await supabaseServer.from("search_events" as never).insert({
      query,
      result_count: result_count ?? 0,
      city: city ?? null,
      session_id: session_id ?? null,
    } as never);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
