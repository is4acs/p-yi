import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading state du formulaire de publication d'un bon plan. Le form
 * est lourd (catégories + villes + stores viennent de Prisma), donc
 * un skeleton évite l'impression de "page blanche" en cold start.
 */
export default function PosterLoading() {
  return (
    <main className="mx-auto max-w-md px-4 pb-16 pt-4 sm:max-w-2xl sm:pt-8">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-4 h-8 w-60" />
      <Skeleton className="mt-2 h-4 w-80" />

      <div className="mt-6 space-y-5">
        {/* Title + description */}
        <div>
          <Skeleton className="h-4 w-20" />
          <Skeleton className="mt-2 h-11 w-full" />
        </div>
        <div>
          <Skeleton className="h-4 w-28" />
          <Skeleton className="mt-2 h-28 w-full" />
        </div>

        {/* Price + category row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Skeleton className="h-4 w-16" />
            <Skeleton className="mt-2 h-11 w-full" />
          </div>
          <div>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-2 h-11 w-full" />
          </div>
        </div>

        {/* Image uploader */}
        <div>
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-2 h-32 w-full" />
        </div>

        {/* Submit */}
        <Skeleton className="h-12 w-full rounded-full" />
      </div>
    </main>
  );
}
