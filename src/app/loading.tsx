import { Skeleton } from "@/components/ui/skeleton";
import { DealCardSkeleton } from "@/components/deals/DealCardSkeleton";
import { ListingCardSkeleton } from "@/components/listings/ListingCardSkeleton";

// Shown by Next.js while the home page Server Components are fetching.
// Matches HomePage layout so the swap is seamless.
export default function HomeLoading() {
  return (
    <main className="mx-auto max-w-md pb-12 sm:max-w-2xl">
      <section className="px-4 pt-6 sm:px-0 sm:pt-10">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-2 h-10 w-32" />
        <Skeleton className="mt-3 h-5 w-72" />
        <Skeleton className="mt-5 h-11 w-full rounded-full" />
        <div className="mt-4 flex gap-2">
          <Skeleton className="h-10 w-44 rounded-full" />
          <Skeleton className="h-10 w-40 rounded-full" />
        </div>
      </section>

      <section className="mt-8 px-4 sm:px-0">
        <Skeleton className="h-5 w-40" />
        <div className="mt-3 flex gap-2 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-24 shrink-0 rounded-full" />
          ))}
        </div>
      </section>

      <section className="mt-8 px-4 sm:px-0">
        <Skeleton className="h-5 w-52" />
        <ul className="mt-4 flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i}>
              <DealCardSkeleton />
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10 px-4 sm:px-0">
        <Skeleton className="h-5 w-44" />
        <ul className="mt-4 flex flex-col gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <li key={i}>
              <ListingCardSkeleton />
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
