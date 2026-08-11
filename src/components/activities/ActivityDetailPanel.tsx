"use client";

import { X } from "lucide-react";

import { ActivityDetailContent } from "@/components/activities/ActivityDetailContent";
import type { ActivityDetailState } from "@/components/activities/use-activity-detail";
import { Skeleton } from "@/components/ui/skeleton";
import { useMessages } from "@/components/soleil/I18nProvider";

/**
 * Panneau détail desktop : carte flottante par-dessus la carte MapLibre
 * (côté gauche de la zone carte, pleine hauteur). Le pendant mobile vit
 * dans le bottom sheet.
 */

type Props = {
  state: ActivityDetailState;
  onClose: () => void;
};

export function ActivityDetailPanel({ state, onClose }: Props) {
  const t = useMessages();
  return (
    <aside
      aria-label={t.act.detailAria}
      className="absolute bottom-3 left-3 top-3 z-10 hidden w-96 max-w-[calc(100%-1.5rem)] flex-col overflow-hidden rounded-[14px] border-[1.5px] border-soleil-border bg-soleil-cream text-soleil-forest shadow-lg dark:border-soleil-border-d dark:bg-soleil-night dark:text-soleil-cream lg:flex"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label={t.act.closeDetail}
        className="absolute right-2 top-2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-soleil-cream/90 shadow-sm backdrop-blur transition hover:bg-soleil-sand dark:bg-soleil-night/90 dark:hover:bg-soleil-forest"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>

      <div className="flex-1 overflow-y-auto p-4">
        {state.status === "loading" && <DetailSkeleton />}
        {state.status === "error" && (
          <div className="flex flex-col items-start gap-3 pt-8">
            <p className="text-sm text-soleil-muted2 dark:text-soleil-muted-d">
              {t.act.cannotLoad}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-[40px] items-center rounded-full border-[1.5px] border-soleil-border px-4 text-sm font-bold dark:border-soleil-border-d"
            >
              {t.act.close}
            </button>
          </div>
        )}
        {state.status === "ready" && (
          <ActivityDetailContent detail={state.detail} />
        )}
      </div>
    </aside>
  );
}

export function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="-mx-4 -mt-4 aspect-[4/3] rounded-none sm:mx-0 sm:mt-0 sm:rounded-md" />
      <div className="space-y-2">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-12 w-full" />
      <div className="space-y-2">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-2/3" />
      </div>
    </div>
  );
}
