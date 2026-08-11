"use client";

import { MapPin } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { useMessages } from "@/components/soleil/I18nProvider";

/**
 * Placeholder affiché pendant le chargement du bundle MapLibre (import
 * dynamique ssr:false) — jamais d'écran blanc, surtout en 3G.
 */
export function ActivityMapSkeleton() {
  const t = useMessages();
  return (
    <div
      role="status"
      aria-live="polite"
      className="relative h-full w-full overflow-hidden"
    >
      <Skeleton className="h-full w-full rounded-none" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-soleil-muted2 dark:text-soleil-muted-d">
        <MapPin className="h-8 w-8 animate-pulse" aria-hidden />
        <p className="text-sm font-medium">{t.act.loadingMap}</p>
      </div>
    </div>
  );
}
