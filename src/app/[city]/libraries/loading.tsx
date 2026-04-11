import { FiltersSkeleton, LibraryGridSkeleton, SearchBarSkeleton } from "@/components/library-listing-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="border-b border-border/50 bg-white py-3">
        <div className="container mx-auto px-6 md:px-10">
          <div className="max-w-xl">
            <SearchBarSkeleton />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 md:px-10">
        <Skeleton className="mb-6 h-4 w-48" />
        <div className="mb-2 flex items-center justify-between gap-4">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-4 w-16" />
        </div>

        <div className="mt-6 flex gap-10">
          <aside className="hidden w-56 shrink-0 lg:block">
            <FiltersSkeleton />
          </aside>

          <div className="min-w-0 flex-1">
            <LibraryGridSkeleton
              count={12}
              gridClassName="grid grid-cols-1 gap-6 gap-y-10 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
