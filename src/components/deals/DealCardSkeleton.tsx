import { Skeleton } from "@/components/ui/skeleton";

/**
 * Matches the shape of <DealCard /> so the transition from skeleton to real
 * content doesn't cause layout shift. Shown by /bons-plans/loading.tsx and co.
 */
export function DealCardSkeleton() {
  return (
    <article className="flex items-stretch gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
      <Skeleton className="h-24 w-24 shrink-0 rounded-lg sm:h-28 sm:w-28" />

      <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-3/5" />
        </div>
        <Skeleton className="h-5 w-24" />
        <div className="flex gap-2">
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-10" />
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-center justify-center gap-1">
        <Skeleton className="h-6 w-6 rounded-full" />
        <Skeleton className="h-3 w-6" />
        <Skeleton className="h-6 w-6 rounded-full" />
      </div>
    </article>
  );
}
