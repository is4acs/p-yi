import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading state d'une conversation. Le fetch du thread (+ participant
 * + listing éventuel) peut prendre ~300ms en cold, un skeleton
 * "bulle de message" évite la sensation de page figée.
 */
export default function ConversationLoading() {
  return (
    <main className="mx-auto flex h-[calc(100vh-4rem)] max-w-md flex-col sm:max-w-2xl">
      {/* Header avec avatar + username */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Skeleton className="h-9 w-9 rounded-full" />
        <div className="flex flex-1 flex-col gap-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>

      {/* Messages : alternance émetteur / destinataire */}
      <div className="flex flex-1 flex-col gap-3 overflow-hidden px-4 py-4">
        <Skeleton className="h-11 w-2/3 self-start rounded-2xl" />
        <Skeleton className="h-14 w-3/4 self-end rounded-2xl" />
        <Skeleton className="h-10 w-1/2 self-start rounded-2xl" />
        <Skeleton className="h-11 w-3/5 self-end rounded-2xl" />
        <Skeleton className="h-16 w-2/3 self-start rounded-2xl" />
      </div>

      {/* Barre de composition */}
      <div className="border-t border-border px-4 py-3">
        <Skeleton className="h-12 w-full rounded-full" />
      </div>
    </main>
  );
}
