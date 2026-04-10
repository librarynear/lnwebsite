"use client";

import { Search, MapPin, Building2, TrainFront, X, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState, useEffect, useCallback } from "react";
import type { Suggestion } from "@/app/api/suggestions/route";

interface SearchBarProps {
  city?: string;
}

const TYPE_ICON = {
  library: Building2,
  locality: MapPin,
  metro: TrainFront,
};

const TYPE_LABEL = {
  library: "Library",
  locality: "Locality",
  metro: "Metro Station",
};

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 220;
const MAX_CACHED_QUERIES = 25;

function groupSuggestions(suggestions: Suggestion[]) {
  const groups: Record<string, Suggestion[]> = {};
  for (const s of suggestions) {
    if (!groups[s.type]) groups[s.type] = [];
    groups[s.type].push(s);
  }
  return groups;
}

export function SearchBar({ city = "delhi" }: SearchBarProps) {
  const router = useRouter();
  const currentParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState(currentParams.get("q") ?? "");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const cacheRef = useRef<Map<string, Suggestion[]>>(new Map());

  const fetchSuggestions = useCallback(async (q: string) => {
    const normalizedQuery = q.trim();
    if (normalizedQuery.length < MIN_QUERY_LENGTH) {
      abortRef.current?.abort();
      setLoading(false);
      setSuggestions([]);
      setOpen(false);
      return;
    }

    const cacheKey = `${city}:${normalizedQuery.toLowerCase()}`;
    const cached = cacheRef.current.get(cacheKey);
    if (cached) {
      setSuggestions(cached);
      setOpen(cached.length > 0);
      setLoading(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const requestId = ++requestIdRef.current;
    setLoading(true);

    try {
      const startedAt = performance.now();
      const res = await fetch(
        `/api/suggestions?q=${encodeURIComponent(normalizedQuery)}&city=${encodeURIComponent(city)}`,
        { signal: controller.signal },
      );
      if (!res.ok) {
        throw new Error(`Suggestion request failed with ${res.status}`);
      }
      const json = await res.json();
      if (requestId !== requestIdRef.current) {
        return;
      }

      const nextSuggestions = json.suggestions ?? [];
      cacheRef.current.set(cacheKey, nextSuggestions);
      if (cacheRef.current.size > MAX_CACHED_QUERIES) {
        const oldestKey = cacheRef.current.keys().next().value;
        if (oldestKey) {
          cacheRef.current.delete(oldestKey);
        }
      }

      if (process.env.NODE_ENV !== "production") {
        console.debug(
          `[perf] suggestions client total=${(performance.now() - startedAt).toFixed(1)}ms q="${normalizedQuery}" count=${nextSuggestions.length}`,
          res.headers.get("Server-Timing") ? `server=${res.headers.get("Server-Timing")}` : "",
        );
      }

      setSuggestions(nextSuggestions);
      setOpen(nextSuggestions.length > 0);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
      if (requestId !== requestIdRef.current) {
        return;
      }
      setSuggestions([]);
      setOpen(false);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [city]);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), DEBOUNCE_MS);
  }

  function navigate(q: string) {
    setOpen(false);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    const locality = currentParams.get("locality");
    if (locality) params.set("locality", locality);
    router.push(`/${city}/libraries?${params.toString()}`);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate(query);
  }

  function handleSuggestionClick(s: Suggestion) {
    if (s.type === "library") {
      router.push(`/${s.city}/library/${s.slug}`);
    } else if (s.type === "locality") {
      router.push(`/${s.city}/locality/${s.slug}`);
    } else {
      // metro — search by metro name
      navigate(s.label);
    }
    setOpen(false);
  }

  function clearInput() {
    abortRef.current?.abort();
    setLoading(false);
    setQuery("");
    setSuggestions([]);
    setOpen(false);
    inputRef.current?.focus();
  }

  // Close on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    const nextQuery = currentParams.get("q") ?? "";
    setQuery((currentQuery) => (currentQuery === nextQuery ? currentQuery : nextQuery));
  }, [currentParams]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, []);

  const grouped = groupSuggestions(suggestions);

  return (
    <div ref={containerRef} className="relative w-full">
      <form
        onSubmit={handleSearch}
        className="flex items-center w-full bg-white rounded-full shadow-[0_3px_15px_-2px_rgba(0,0,0,0.12)] border border-border hover:shadow-[0_4px_22px_-2px_rgba(0,0,0,0.16)] transition-shadow pl-8 pr-2 py-2"
      >
        <div className="flex-1 flex flex-col justify-center min-w-0">
          <span className="text-[11px] font-bold tracking-wider text-black">Where</span>
          <div className="flex items-center gap-1.5">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleInputChange}
              onFocus={() => suggestions.length > 0 && setOpen(true)}
              placeholder="Locality, metro station, or library name..."
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground truncate pt-0.5 min-w-0"
              autoComplete="off"
            />
            {query && (
              <button
                type="button"
                onClick={clearInput}
                className="shrink-0 text-muted-foreground hover:text-black transition-colors"
                aria-label="Clear"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
        <button
          type="submit"
          className="h-12 w-12 ml-2 rounded-full bg-primary text-white flex items-center justify-center shrink-0 hover:bg-primary/90 transition-colors shadow-sm"
          aria-label="Search"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" strokeWidth={3} />
          ) : (
            <Search className="h-5 w-5" strokeWidth={3} />
          )}
        </button>
      </form>

      {/* SUGGESTIONS DROPDOWN */}
      {open && suggestions.length > 0 && (
        <div className="absolute top-[calc(100%+8px)] left-0 right-0 z-50 bg-white rounded-2xl shadow-[0_8px_30px_-4px_rgba(0,0,0,0.18)] border border-border overflow-hidden">
          {(["library", "locality", "metro"] as const).map((type) => {
            const items = grouped[type];
            if (!items?.length) return null;
            const Icon = TYPE_ICON[type];
            return (
              <div key={type}>
                <div className="px-4 pt-3 pb-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {TYPE_LABEL[type]}s
                  </p>
                </div>
                {items.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSuggestionClick(s)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/60 transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <span className="text-sm font-medium text-black truncate">{s.label}</span>
                    <span className="ml-auto text-xs text-muted-foreground shrink-0 capitalize">{s.city}</span>
                  </button>
                ))}
              </div>
            );
          })}
          <div className="px-4 py-2.5 border-t border-border/50">
            <button
              type="button"
              onClick={() => navigate(query)}
              className="text-sm text-primary font-semibold hover:underline flex items-center gap-1.5"
            >
              <Search className="h-3.5 w-3.5" />
              Search all results for &ldquo;{query}&rdquo;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
