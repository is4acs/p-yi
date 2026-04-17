import { Skeleton } from "@/components/ui/skeleton";
import { ListingCardSkeleton } from "@/components/listings/ListingCardSkeleton";

/**
 * Squelette de la page `/annonces` — pensé pour matcher le layout final
 * (sticky header + search + pills + tabs + filter bar + grille) pour
 * qu'il n'y ait pas de saut visuel quand les vraies données arrivent.
 *
 * Si on ajoute un nouveau bloc persistant dans la sticky header (ex.
 * panel de filtres attribut, chips de filtres actifs), le skeleton doit
 * recevoir un placeholder équivalent.
 */
export default function ListingsLoading() {
  return (
    <main className="mx-auto max-w-md pb-12 sm:max-w-2xl">
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 px-4 pb-3 pt-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-0 sm:pt-6">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-7 w-28 sm:h-8 sm:w-36" />
            <Skeleton className="h-3 w-40" />
          </div>
          <Skeleton className="h-9 w-24 rounded-full" />
        </div>

        <div className="mt-3 space-y-2">
          {/* Search bar */}
          <Skeleton className="h-11 w-full rounded-full" />
          {/* Type pills */}
          <div className="flex gap-1">
            <Skeleton className="h-7 w-12 rounded-full" />
            <Skeleton className="h-7 w-20 rounded-full" />
            <Skeleton className="h-7 w-24 rounded-full" />
            <Skeleton className="h-7 w-20 rounded-full" />
            <Skeleton className="h-7 w-16 rounded-full" />
          </div>
          {/* Sort tabs */}
          <div className="flex gap-1">
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-8 w-20 rounded-full" />
            <Skeleton className="h-8 w-20 rounded-full" />
          </div>
          {/* Filter bar (category + city + submit) */}
          <div className="flex gap-2">
            <Skeleton className="h-9 flex-1 rounded-md" />
            <Skeleton className="h-9 flex-1 rounded-md" />
            <Skeleton className="h-9 w-16 rounded-md" />
          </div>
        </div>
      </div>

      <ul className="flex flex-col gap-3 px-4 pt-4 sm:px-0">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i}>
            <ListingCardSkeleton />
          </li>
        ))}
      </ul>
    </main>
  );
}
