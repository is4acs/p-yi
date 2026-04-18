import { Skeleton } from "@/components/ui/skeleton";

/**
 * Squelette de `ListingCardTile` — même structure (image 4:3 + 3 lignes)
 * pour éviter un saut de layout quand les vraies données arrivent.
 */
export function ListingCardTileSkeleton() {
  return (
    <article className="flex flex-col">
      <Skeleton className="aspect-[4/3] w-full rounded-xl" />
      <div className="mt-2 space-y-1.5 px-0.5">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </article>
  );
}
