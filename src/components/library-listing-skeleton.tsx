import { MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function SearchBarSkeleton() {
  return (
    <div className="flex items-center w-full rounded-full border border-border bg-white px-8 py-3 shadow-[0_3px_15px_-2px_rgba(0,0,0,0.08)]">
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-12 rounded-full" />
        <Skeleton className="h-4 w-48 rounded-full" />
      </div>
      <Skeleton className="h-12 w-12 rounded-full" />
    </div>
  );
}

function LibraryCardSkeleton({ showBadge = true }: { showBadge?: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-muted">
        <div className="flex h-full w-full items-center justify-center">
          <MapPin className="h-10 w-10 text-muted-foreground/20" />
        </div>
        <Skeleton className="absolute top-3 right-3 h-6 w-6 rounded-full bg-white/80" />
        {showBadge && (
          <Skeleton className="absolute top-3 left-3 h-6 w-[72px] rounded-md bg-white/85" />
        )}
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-3 w-2/5" />
        <Skeleton className="h-3 w-3/5" />
      </div>
    </div>
  );
}

export function LibraryGridSkeleton({
  count = 10,
  gridClassName = "grid grid-cols-1 gap-6 gap-y-10 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4",
  showBadge = true,
}: {
  count?: number;
  gridClassName?: string;
  showBadge?: boolean;
}) {
  return (
    <div className={gridClassName}>
      {Array.from({ length: count }).map((_, index) => (
        <LibraryCardSkeleton key={index} showBadge={showBadge} />
      ))}
    </div>
  );
}

export function FiltersSkeleton() {
  return (
    <div className="space-y-3 rounded-2xl border border-border/60 p-4">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-9 w-full rounded-xl" />
      <Skeleton className="h-9 w-full rounded-xl" />
      <Skeleton className="h-9 w-full rounded-xl" />
      <Skeleton className="h-9 w-full rounded-xl" />
    </div>
  );
}
