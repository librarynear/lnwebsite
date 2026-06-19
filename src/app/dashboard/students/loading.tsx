import { Skeleton } from "@/components/ui/skeleton"

export default function StudentsLoading() {
  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-2">
          <Skeleton className="h-10 w-48 bg-muted" />
          <Skeleton className="h-4 w-64 bg-muted/50" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 w-10 bg-muted rounded-md" />
          <Skeleton className="h-10 w-32 bg-muted rounded-md" />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <Skeleton className="h-10 w-full sm:w-64 bg-muted" />
          <Skeleton className="h-10 w-full sm:w-32 bg-muted" />
        </div>
        <div className="p-4 space-y-4">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="flex items-center justify-between space-x-4">
              <Skeleton className="h-12 w-full bg-muted/30" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
