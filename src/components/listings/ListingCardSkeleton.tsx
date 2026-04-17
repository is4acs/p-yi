import { Skeleton } from "@/components/ui/skeleton";

/**
 * Matches the shape of <ListingCard /> so the transition from skeleton to real
 * content doesn't cause layout shift. Shown by /annonces/loading.tsx and co.
 */
export function ListingCardSkeleton() {
  return (
    <article className="flex items-stretch gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
      <Skeleton className="h-24 w-24 shrink-0 rounded-lg sm:h-28 sm:w-28" />

      <div className="flex min-w-0 flex-1 flex-col justify-between gap-1.5">
        <div className="space-y-1">
          <Skeleton className="h-4 w-16 rounded-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <Skeleton className="h-5 w-20" />
        <div className="flex gap-2">
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-10" />
        </div>
      </div>
    </article>
  );
}
