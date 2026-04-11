import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="container mx-auto border-b border-border/50 px-6 py-6 md:px-10">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div className="w-full max-w-2xl">
            <Skeleton className="mb-3 h-4 w-72" />
            <Skeleton className="h-10 w-full max-w-xl" />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>

          <div className="flex w-full gap-2 md:w-auto">
            <Skeleton className="h-9 flex-1 rounded-lg md:w-28 md:flex-none" />
            <Skeleton className="h-9 flex-1 rounded-lg md:w-24 md:flex-none" />
          </div>
        </div>
      </div>

      <div className="container mx-auto grid grid-cols-1 gap-10 px-6 py-8 md:px-10 lg:grid-cols-3">
        <div className="space-y-10 lg:col-span-2">
          <div className="grid h-[340px] grid-cols-2 gap-3">
            <Skeleton className="col-span-1 row-span-2 h-full rounded-xl" />
            <Skeleton className="h-full rounded-xl" />
            <Skeleton className="h-full rounded-xl" />
          </div>

          <section>
            <Skeleton className="mb-4 h-8 w-24" />
            <div className="space-y-3">
              <Skeleton className="h-4 w-full max-w-2xl" />
              <Skeleton className="h-4 w-full max-w-xl" />
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-32" />
            </div>
          </section>

          <section>
            <Skeleton className="mb-4 h-8 w-28" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-12 rounded-xl" />
              ))}
            </div>
          </section>

          <section>
            <Skeleton className="mb-4 h-8 w-28" />
            <Card className="overflow-hidden border-border/60">
              <CardContent className="p-0">
                <Skeleton className="h-52 w-full" />
                <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-72" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                  <Skeleton className="h-10 w-36 rounded-lg" />
                </div>
              </CardContent>
            </Card>
          </section>
        </div>

        <div>
          <Card className="sticky top-28 overflow-hidden rounded-2xl border border-border/80 shadow-sm">
            <CardContent className="p-6">
              <div className="space-y-5">
                <Skeleton className="h-16 w-full rounded-xl" />
                <div className="border-t border-border/50 pt-5">
                  <Skeleton className="mb-2 h-6 w-32" />
                  <Skeleton className="mb-4 h-4 w-64" />
                  <div className="space-y-2.5">
                    <Skeleton className="h-11 w-full rounded-lg" />
                    <Skeleton className="h-11 w-full rounded-lg" />
                    <Skeleton className="mt-1 h-11 w-full rounded-lg" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
