import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <div className="container mx-auto px-6 py-12 md:px-10">
      <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-3xl border border-border bg-white p-6 shadow-sm md:p-8">
          <div className="flex items-center gap-4">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-8 w-52" />
              <Skeleton className="mt-2 h-4 w-48" />
              <Skeleton className="mt-3 h-3 w-36" />
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[0, 1].map((card) => (
              <div key={card} className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                <Skeleton className="mb-3 h-10 w-10 rounded-2xl" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="mt-3 h-7 w-14" />
                <Skeleton className="mt-2 h-4 w-32" />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-border bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Skeleton className="h-6 w-44" />
                <Skeleton className="mt-2 h-4 w-52" />
              </div>
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="mt-5 space-y-3">
              {[0, 1, 2].map((item) => (
                <Skeleton key={item} className="h-20 rounded-2xl" />
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-white p-6 shadow-sm">
            <Skeleton className="h-6 w-32" />
            <div className="mt-4 space-y-3">
              {[0, 1].map((item) => (
                <Skeleton key={item} className="h-12 rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
