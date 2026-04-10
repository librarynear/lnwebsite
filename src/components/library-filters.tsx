"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

const SORT_OPTIONS = [
  { label: "Best Match", value: "" },
  { label: "Name A–Z", value: "name_asc" },
  { label: "Most Complete", value: "completeness" },
  { label: "Verified First", value: "verified" },
];

interface LibraryFiltersProps {
  city: string;
  localities: string[];
  currentLocality?: string;
  currentSort?: string;
  currentQ?: string;
  verifiedOnly?: boolean;
  totalCount: number;
}

export function LibraryFilters({
  city,
  localities,
  currentLocality,
  currentSort,
  currentQ,
  verifiedOnly,
  totalCount,
}: LibraryFiltersProps) {
  const pathname = usePathname();

  function buildUrl(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged = {
      q: currentQ,
      locality: currentLocality,
      sort: currentSort,
      verified: verifiedOnly ? "1" : undefined,
      ...overrides,
    };
    for (const [k, v] of Object.entries(merged)) {
      if (v) params.set(k, v);
    }
    return `${pathname}?${params.toString()}`;
  }

  const hasFilters = !!(currentLocality || currentQ || currentSort || verifiedOnly);

  return (
    <div className="flex flex-col gap-5">
      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        <span className="font-semibold text-black">{totalCount}</span> libraries found
        {currentQ && <> for <span className="font-semibold text-black">"{currentQ}"</span></>}
        {currentLocality && <> in <span className="font-semibold text-black">{currentLocality}</span></>}
      </p>

      {/* Clear all */}
      {hasFilters && (
        <Link
          href={`/${city}/libraries`}
          className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <X className="w-3.5 h-3.5" /> Clear all filters
        </Link>
      )}

      {/* Verified toggle */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Filter</p>
        <Link
          href={buildUrl({ verified: verifiedOnly ? undefined : "1" })}
          className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg border transition-colors ${
            verifiedOnly
              ? "bg-primary/5 border-primary/30 text-primary font-semibold"
              : "border-border text-muted-foreground hover:text-black hover:border-black/40"
          }`}
        >
          <span
            className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] font-bold ${
              verifiedOnly ? "bg-primary border-primary text-white" : "border-border"
            }`}
          >
            {verifiedOnly && "✓"}
          </span>
          Verified only
        </Link>
      </div>

      {/* Sort */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Sort by</p>
        <div className="flex flex-col gap-1">
          {SORT_OPTIONS.map((opt) => (
            <Link
              key={opt.value}
              href={buildUrl({ sort: opt.value || undefined })}
              className={`text-sm px-3 py-2 rounded-lg transition-colors ${
                (currentSort ?? "") === opt.value
                  ? "bg-primary/5 text-primary font-semibold"
                  : "text-muted-foreground hover:text-black hover:bg-muted/50"
              }`}
            >
              {opt.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Locality */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Locality</p>
        <div className="flex flex-col gap-1 max-h-64 overflow-y-auto pr-1">
          <Link
            href={buildUrl({ locality: undefined })}
            className={`text-sm px-3 py-2 rounded-lg transition-colors ${
              !currentLocality
                ? "bg-primary/5 text-primary font-semibold"
                : "text-muted-foreground hover:text-black hover:bg-muted/50"
            }`}
          >
            All localities
          </Link>
          {localities.map((loc) => (
            <Link
              key={loc}
              href={buildUrl({ locality: loc })}
              className={`text-sm px-3 py-2 rounded-lg transition-colors ${
                currentLocality === loc
                  ? "bg-primary/5 text-primary font-semibold"
                  : "text-muted-foreground hover:text-black hover:bg-muted/50"
              }`}
            >
              {loc}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
