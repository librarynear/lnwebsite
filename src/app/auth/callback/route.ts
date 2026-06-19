import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { upsertProfileFromUser } from "@/lib/auth/profile";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const requestedNext = searchParams.get("next") ?? "/profile";

  const SAFE_PATH_PREFIXES = ["/profile", "/saved", "/for-owners", "/"];
  function isSafeRedirect(path: string): boolean {
    if (!path.startsWith("/")) return false;
    if (path.startsWith("//") || path.startsWith("/\\")) return false;
    if (path.includes("..")) return false;
    if (path.startsWith("/admin") || path.startsWith("/staff-access")) return false;
    return SAFE_PATH_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix + "/") || path.startsWith(prefix + "?"));
  }

  const next = isSafeRedirect(requestedNext) ? requestedNext : "/profile";

  if (!code) {
    return NextResponse.redirect(new URL(next, origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("OAuth callback error:", error.message);
    return NextResponse.redirect(new URL("/", origin));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await upsertProfileFromUser(user);
  }

  return NextResponse.redirect(new URL(next, origin));
}
