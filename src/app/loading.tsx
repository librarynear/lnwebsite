import { LibraryGridSkeleton, SearchBarSkeleton } from "@/components/library-listing-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col">
      <section className="flex w-full flex-col items-center justify-center border-b border-border/40 bg-white pt-8 pb-10">
        <div className="w-full max-w-140 px-4">
          <SearchBarSkeleton />
        </div>
      </section>

      <div className="w-full border-b border-border/50 bg-white">
        <div className="container mx-auto flex gap-8 overflow-x-auto px-6 py-4 md:px-10">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="flex min-w-max flex-col items-center gap-2">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-3 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </div>

      <section className="container mx-auto px-6 py-10 pb-20 md:px-10">
        <Skeleton className="mb-6 h-7 w-56" />
        <LibraryGridSkeleton
          count={10}
          gridClassName="grid grid-cols-1 gap-6 gap-y-10 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
        />
      </section>
    </div>
  );
}
