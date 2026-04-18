import { Skeleton } from "@/components/ui/skeleton";
import { ListingCardTileSkeleton } from "@/components/listings/ListingCardTileSkeleton";

/**
 * Squelette de `/annonces` — aligné sur le layout post-S27 : header
 * minimal (title + Poster + search + Filtrer), puis grille 2/3/4 cols
 * de `ListingCardTileSkeleton`. Évite tout layout shift quand les
 * vraies données arrivent.
 *
 * Si tu ajoutes un bloc persistant au header, ajoute un placeholder
 * correspondant ici pour garder la parité visuelle.
 */
export default function ListingsLoading() {
  return (
    <main className="mx-auto max-w-md pb-12 sm:max-w-2xl lg:max-w-6xl">
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 px-4 pb-3 pt-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-0 sm:pt-6">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-7 w-28 sm:h-8 sm:w-36" />
            <Skeleton className="h-3 w-40" />
          </div>
          <Skeleton className="h-10 w-24 rounded-full" />
        </div>

        {/* Row : SearchBar + Filtrer */}
        <div className="mt-3 flex items-center gap-2">
          <Skeleton className="h-11 flex-1 rounded-full" />
          <Skeleton className="h-10 w-24 rounded-full" />
        </div>
      </div>

      <ul className="grid grid-cols-2 gap-4 px-4 pt-4 sm:grid-cols-3 sm:px-0 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <li key={i}>
            <ListingCardTileSkeleton />
          </li>
        ))}
      </ul>
    </main>
  );
}
