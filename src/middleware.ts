import { NextResponse, type NextRequest } from 'next/server'
import { rateLimiters } from '@/lib/rate-limit';

function getClientIp(request: NextRequest): string {
  // On Vercel, `x-real-ip` is set by the platform edge and any client-supplied
  // value is overwritten, so it cannot be spoofed. Prefer it over the raw
  // `x-forwarded-for` header (which a client can fully control off-platform).
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  // Fallback for non-Vercel hosts: the first address in x-forwarded-for is the
  // original client. We still take only the first hop to avoid per-request
  // bucket evasion via appended fake IPs.
  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }

  return '127.0.0.1';
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith('/api');
  // Server Actions are POSTs to page routes carrying the `Next-Action` header.
  // Without this, all mutations (bookings, admin, plans) would be unthrottled.
  const isServerAction = request.method === 'POST' && request.headers.has('next-action');

  // --- Rate Limiting ---
  if (isApi || isServerAction) {
    const isSensitive =
      pathname.startsWith('/api/auth') ||
      pathname.startsWith('/api/razorpay') ||
      pathname.startsWith('/api/kyc') ||
      pathname.startsWith('/api/checkout');

    try {
      const ip = getClientIp(request);
      const { success } = await (isSensitive ? rateLimiters.sensitive : rateLimiters.api).limit(ip);

      if (!success) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
      }
    } catch (e) {
      console.error('Rate limit error:', e);
      // Sensitive endpoints (auth/payments/KYC) FAIL CLOSED — a limiter outage
      // must not open them to abuse. General API endpoints fail open for uptime.
      if (isSensitive) {
        return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 });
      }
    }
  }

  // A lightweight check in edge middleware.
  // True verification happens in getSession() using firebase-admin in Node environments.
  const session = request.cookies.get('session')?.value;

  // Protect dashboard and onboarding routes
  if (request.nextUrl.pathname.startsWith('/dashboard') || request.nextUrl.pathname.startsWith('/student') || request.nextUrl.pathname.startsWith('/onboarding') || request.nextUrl.pathname.startsWith('/admin')) {
    if (!session) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('returnUrl', request.nextUrl.pathname + request.nextUrl.search);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
