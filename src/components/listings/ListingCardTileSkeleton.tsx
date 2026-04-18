import { Skeleton } from "@/components/ui/skeleton";

/**
 * Squelette de `ListingCardTile` — aligné sur le layout post-S28 :
 * carte blanche bordée + image 5:3 + body padding 9/11/10px. Évite
 * tout saut de layout quand les vraies données arrivent.
 */
export function ListingCardTileSkeleton() {
  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-ink-100 bg-background">
      <Skeleton className="aspect-[5/3] w-full rounded-none" />
      <div className="space-y-1.5 px-[11px] pb-[10px] pt-[9px]">
        <Skeleton className="h-[15px] w-20" />
        <Skeleton className="h-[13px] w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </article>
  );
}
