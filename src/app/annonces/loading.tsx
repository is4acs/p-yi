import { Skeleton } from "@/components/ui/skeleton";
import { ListingCardSkeleton } from "@/components/listings/ListingCardSkeleton";

export default function ListingsLoading() {
  return (
    <main className="mx-auto max-w-md px-4 pb-16 pt-4 sm:max-w-2xl sm:pt-8">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="mt-2 h-4 w-72" />

      <div className="mt-5 space-y-3">
        <Skeleton className="h-11 w-full rounded-full" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20 rounded-full" />
          <Skeleton className="h-9 w-24 rounded-full" />
          <Skeleton className="h-9 w-16 rounded-full" />
        </div>
      </div>

      <ul className="mt-6 flex flex-col gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i}>
            <ListingCardSkeleton />
          </li>
        ))}
      </ul>
    </main>
  );
}
