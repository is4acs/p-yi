import { Skeleton } from "@/components/ui/skeleton";

export default function ProfilLoading() {
  return (
    <main className="mx-auto max-w-md px-4 pb-16 pt-6 sm:max-w-2xl sm:pt-10">
      <section className="flex flex-col items-center text-center">
        <Skeleton className="h-20 w-20 rounded-full" />
        <Skeleton className="mt-3 h-7 w-32" />
        <Skeleton className="mt-2 h-4 w-48" />
      </section>

      <section className="mt-6 space-y-3 rounded-lg border border-border bg-card p-4">
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 w-32" />
        </div>
      </section>

      <Skeleton className="mt-6 h-16 w-full rounded-lg" />
      <Skeleton className="mt-8 h-12 w-full rounded-md" />
    </main>
  );
}
