import "server-only";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const store = new Map<string, RateLimitEntry>();

const CLEANUP_INTERVAL_MS = 60_000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
}

export type RateLimitConfig = {
  /** Unique identifier for this limiter (e.g. "log-search", "submit-lead") */
  id: string;
  /** Maximum requests allowed within the window */
  maxRequests: number;
  /** Window size in milliseconds */
  windowMs: number;
};

export type RateLimitResult = {
  success: boolean;
  remaining: number;
  resetAt: number;
};

/**
 * Check rate limit for a given IP + limiter combination.
 * Uses a fixed-window counter per IP. Lightweight and effective for
 * single-instance deployments (Vercel serverless has shared memory
 * within a single instance's lifetime).
 */
export function checkRateLimit(ip: string, config: RateLimitConfig): RateLimitResult {
  cleanup();

  const key = `${config.id}:${ip}`;
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return { success: true, remaining: config.maxRequests - 1, resetAt: now + config.windowMs };
  }

  if (entry.count >= config.maxRequests) {
    return { success: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { success: true, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt };
}

/**
 * Extract client IP from request headers.
 * Checks common proxy headers used by Vercel, Cloudflare, and nginx.
 */
export function getClientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

export const RATE_LIMITS = {
  logSearch: { id: "log-search", maxRequests: 30, windowMs: 60_000 },
  suggestions: { id: "suggestions", maxRequests: 60, windowMs: 60_000 },
  ownerImageUpload: { id: "owner-image-upload", maxRequests: 10, windowMs: 60_000 },
  submitLead: { id: "submit-lead", maxRequests: 5, windowMs: 60_000 },
  submitOwnerLibrary: { id: "submit-owner-library", maxRequests: 3, windowMs: 60_000 },
  staffLogin: { id: "staff-login", maxRequests: 5, windowMs: 15 * 60_000 },
  ownerPlansUpdate: { id: "owner-plans-update", maxRequests: 10, windowMs: 60_000 },
} as const;
