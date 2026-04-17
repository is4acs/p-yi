import { Skeleton } from "@/components/ui/skeleton";
import { DealCardSkeleton } from "@/components/deals/DealCardSkeleton";

export default function FavorisLoading() {
  return (
    <main className="mx-auto max-w-md px-4 pb-16 pt-6 sm:max-w-2xl sm:pt-10">
      <Skeleton className="h-4 w-16" />

      <div className="mt-4 space-y-2">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-4 w-64" />
      </div>

      <div className="mt-5 flex gap-1 rounded-full border border-border bg-muted/50 p-1">
        <Skeleton className="h-8 flex-1 rounded-full" />
        <Skeleton className="h-8 flex-1 rounded-full" />
      </div>

      <ul className="mt-6 flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <li key={i}>
            <DealCardSkeleton />
          </li>
        ))}
      </ul>
    </main>
  );
}
