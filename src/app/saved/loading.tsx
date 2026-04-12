import { Skeleton } from "@/components/ui/skeleton";

export default function SavedLoading() {
  return (
    <div className="container mx-auto px-4 py-12 md:py-16 max-w-7xl min-h-[70vh]">
      <Skeleton className="h-10 w-64 md:h-14" />
      <Skeleton className="mt-3 h-5 w-72" />

      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[0, 1, 2, 3].map((card) => (
          <div key={card} className="flex flex-col gap-3">
            <Skeleton className="aspect-[4/3] w-full rounded-xl" />
            <Skeleton className="h-5 w-[72%]" />
            <Skeleton className="h-4 w-[48%]" />
            <Skeleton className="h-4 w-[64%]" />
          </div>
        ))}
      </div>
    </div>
  );
}
