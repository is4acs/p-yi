import { Skeleton } from "@/components/ui/skeleton";

/**
 * Squelette de la page détail. Reflète la structure réelle :
 * back-link + hero + chips + titre + prix + boutons d'action +
 * stats 3-col + description + vendeur.
 *
 * La hauteur du hero matche `aspect-[4/3]` mobile / `aspect-[16/10]`
 * desktop pour éviter un saut lors de l'hydratation.
 */
export default function ListingDetailLoading() {
  return (
    <main className="mx-auto max-w-md pb-16 sm:max-w-2xl">
      <div className="px-4 pt-4 sm:px-0 sm:pt-6">
        <Skeleton className="h-4 w-24" />
      </div>

      <div className="mt-3 px-4 sm:px-0">
        <Skeleton className="aspect-[4/3] w-full rounded-xl sm:aspect-[16/10]" />
      </div>

      <div className="space-y-3 px-4 pt-5 sm:px-0">
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <Skeleton className="h-8 w-11/12" />
        <Skeleton className="h-8 w-4/5" />
        <Skeleton className="mt-1 h-9 w-40" />
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-10 w-36 rounded-md" />
      </div>

      <div className="mt-5 space-y-2 px-4 sm:px-0">
        <Skeleton className="h-12 w-full rounded-md" />
        <Skeleton className="h-12 w-full rounded-md" />
      </div>

      <div className="mt-6 grid grid-cols-3 gap-2 px-4 sm:px-0">
        <Skeleton className="h-14 rounded-lg" />
        <Skeleton className="h-14 rounded-lg" />
        <Skeleton className="h-14 rounded-lg" />
      </div>

      <div className="mt-6 space-y-2 px-4 sm:px-0">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-10/12" />
        <Skeleton className="h-4 w-9/12" />
      </div>

      <div className="mx-4 mt-6 flex items-center gap-3 rounded-lg border border-border bg-card p-3 sm:mx-0">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    </main>
  );
}
