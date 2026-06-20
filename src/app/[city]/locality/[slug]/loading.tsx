import { LibraryGridSkeleton } from "@/components/library-listing-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="container mx-auto px-6 py-8 md:px-10">
        <Skeleton className="mb-6 h-4 w-56" />
        <div className="mb-10 space-y-3">
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-4 w-full max-w-2xl" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </div>

        <LibraryGridSkeleton
          count={10}
          gridClassName="grid grid-cols-1 gap-6 gap-y-10 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
        />
      </div>
    </div>
  );
}
