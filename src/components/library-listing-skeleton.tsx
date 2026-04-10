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

export function LibraryGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-6 gap-y-10 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex flex-col gap-2">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-3 w-2/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
        </div>
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
