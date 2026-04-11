"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

const SORT_OPTIONS = [
  { label: "Best Match", value: "" },
  { label: "Nearest First", value: "distance" },
  { label: "Name A-Z", value: "name_asc" },
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
  nearbyMode?: boolean;
  nearbyLat?: string;
  nearbyLng?: string;
  totalCount: number;
}

export function LibraryFilters({
  city,
  localities,
  currentLocality,
  currentSort,
  currentQ,
  verifiedOnly,
  nearbyMode,
  nearbyLat,
  nearbyLng,
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
      nearby: nearbyMode ? "1" : undefined,
      lat: nearbyLat,
      lng: nearbyLng,
      ...overrides,
    };

    for (const [key, value] of Object.entries(merged)) {
      if (value) params.set(key, value);
    }

    return `${pathname}?${params.toString()}`;
  }

  const hasFilters = !!(currentLocality || currentQ || currentSort || verifiedOnly || nearbyMode);
  const visibleSortOptions = nearbyMode
    ? SORT_OPTIONS.filter((option) => option.value !== "")
    : SORT_OPTIONS.filter((option) => option.value !== "distance");

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-muted-foreground">
        <span className="font-semibold text-black">{totalCount}</span> libraries found
        {nearbyMode ? (
          <> <span className="font-semibold text-black">near you</span></>
        ) : currentQ ? (
          <> for <span className="font-semibold text-black">&quot;{currentQ}&quot;</span></>
        ) : null}
        {currentLocality && <> in <span className="font-semibold text-black">{currentLocality}</span></>}
      </p>

      {hasFilters && (
        <Link
          href={`/${city}/libraries`}
          className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <X className="w-3.5 h-3.5" /> Clear all filters
        </Link>
      )}

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
            {verifiedOnly ? "✓" : ""}
          </span>
          Verified only
        </Link>
      </div>

      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Sort by</p>
        <div className="flex flex-col gap-1">
          {visibleSortOptions.map((option) => (
            <Link
              key={option.value}
              href={buildUrl({ sort: option.value || undefined })}
              className={`text-sm px-3 py-2 rounded-lg transition-colors ${
                (currentSort ?? "") === option.value
                  ? "bg-primary/5 text-primary font-semibold"
                  : "text-muted-foreground hover:text-black hover:bg-muted/50"
              }`}
            >
              {option.label}
            </Link>
          ))}
        </div>
      </div>

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
          {localities.map((locality) => (
            <Link
              key={locality}
              href={buildUrl({ locality })}
              className={`text-sm px-3 py-2 rounded-lg transition-colors ${
                currentLocality === locality
                  ? "bg-primary/5 text-primary font-semibold"
                  : "text-muted-foreground hover:text-black hover:bg-muted/50"
              }`}
            >
              {locality}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
