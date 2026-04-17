import { Skeleton } from "@/components/ui/skeleton";

export default function DealDetailLoading() {
  return (
    <main className="mx-auto max-w-md px-4 pb-16 pt-4 sm:max-w-2xl sm:pt-8">
      <Skeleton className="h-4 w-24" />

      <div className="mt-4 space-y-4">
        <Skeleton className="h-64 w-full rounded-xl" />

        <div className="space-y-2">
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
          <Skeleton className="h-8 w-11/12" />
          <Skeleton className="h-8 w-4/5" />
        </div>

        <Skeleton className="h-10 w-36" />

        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-10/12" />
          <Skeleton className="h-4 w-9/12" />
        </div>

        <div className="flex items-center gap-3 pt-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </div>
    </main>
  );
}
