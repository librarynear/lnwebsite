import { Skeleton } from "@/components/ui/skeleton";

export default function ForOwnersLoading() {
  return (
    <div className="bg-slate-50/50">
      <section className="bg-[#0F74C5]">
        <div className="container mx-auto grid gap-10 px-6 py-14 md:grid-cols-[1.15fr_0.85fr] md:px-10 md:py-18">
          <div>
            <Skeleton className="h-9 w-44 rounded-full bg-white/20" />
            <Skeleton className="mt-5 h-12 w-full max-w-2xl bg-white/20" />
            <Skeleton className="mt-3 h-12 w-[90%] max-w-xl bg-white/20" />
            <Skeleton className="mt-4 h-5 w-full max-w-xl bg-white/15" />
            <Skeleton className="mt-2 h-5 w-[80%] max-w-lg bg-white/15" />
            <div className="mt-8 flex gap-3">
              <Skeleton className="h-12 w-44 rounded-full bg-white/20" />
              <Skeleton className="h-12 w-36 rounded-full bg-white/12" />
            </div>
          </div>

          <div className="grid gap-4 rounded-3xl border border-border bg-white p-6 shadow-sm">
            {[0, 1, 2].map((card) => (
              <div key={card} className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                <Skeleton className="mb-3 h-10 w-10 rounded-2xl" />
                <Skeleton className="h-5 w-40" />
                <Skeleton className="mt-2 h-4 w-full" />
                <Skeleton className="mt-2 h-4 w-[80%]" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto grid gap-8 px-6 py-12 lg:grid-cols-[1.1fr_0.9fr] md:px-10">
        <div className="rounded-3xl bg-white p-6 shadow-md md:p-8">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-3 h-4 w-[70%]" />
          <div className="mt-8 grid gap-4">
            {[0, 1, 2, 3, 4, 5, 6].map((row) => (
              <div key={row} className="grid gap-4 md:grid-cols-2">
                <Skeleton className="h-14 rounded-2xl" />
                <Skeleton className="h-14 rounded-2xl" />
              </div>
            ))}
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-12 w-44 rounded-full" />
          </div>
        </div>

        <div className="space-y-6">
          {[0, 1].map((panel) => (
            <div key={panel} className="rounded-3xl bg-white p-6 shadow-sm">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="mt-4 h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-[85%]" />
              <div className="mt-5 space-y-3">
                {[0, 1, 2].map((item) => (
                  <Skeleton key={item} className="h-18 rounded-2xl" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
