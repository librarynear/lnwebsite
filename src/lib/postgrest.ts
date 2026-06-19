/**
 * Maximum length for a user-supplied free-text search term. Anything longer is
 * truncated before it reaches the database to avoid oversized query plans,
 * cache keys, and metadata.
 */
export const MAX_SEARCH_QUERY_LENGTH = 200;

/**
 * Escape characters that have special meaning inside a PostgREST filter string
 * (the value side of `.or()` / `.ilike()` interpolations). Without this, a
 * crafted query such as `%,id.eq.<uuid>` could inject additional filter
 * clauses and change the query semantics.
 */
export function escapePostgrestFilter(value: string): string {
  return value.replace(/[\\%_,.()"*]/g, (ch) => `\\${ch}`);
}

/**
 * Normalize a raw search term: trim, cap length, and escape PostgREST-special
 * characters. Returns a value safe to interpolate into `.or()` filters.
 */
export function sanitizeSearchTerm(value: string | null | undefined): string {
  if (!value) return "";
  return escapePostgrestFilter(value.trim().slice(0, MAX_SEARCH_QUERY_LENGTH));
}

/**
 * Bound a raw search term length without escaping. Use for values passed as RPC
 * parameters (which are sent as JSON, not interpolated into filter strings).
 */
export function boundSearchTerm(value: string | null | undefined): string {
  if (!value) return "";
  return value.trim().slice(0, MAX_SEARCH_QUERY_LENGTH);
}
