import { Skeleton } from "@/components/ui/skeleton";

export default function MessagesLoading() {
  return (
    <main className="mx-auto max-w-md px-4 pb-16 pt-6 sm:max-w-2xl sm:pt-10">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>

      <ul className="mt-6 flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <li
            key={i}
            className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
          >
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-full" />
            </div>
            <Skeleton className="h-12 w-12 rounded-md" />
          </li>
        ))}
      </ul>
    </main>
  );
}
