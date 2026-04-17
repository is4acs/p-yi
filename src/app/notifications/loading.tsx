import { Skeleton } from "@/components/ui/skeleton";

export default function NotificationsLoading() {
  return (
    <main className="mx-auto max-w-md px-4 pb-16 pt-6 sm:max-w-2xl sm:pt-10">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-8 w-28" />
      </div>

      <Skeleton className="mt-8 h-3 w-24" />
      <ul className="mt-2 flex flex-col gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <li
            key={i}
            className="flex items-start gap-3 rounded-lg border border-border bg-card p-3"
          >
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-full" />
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
