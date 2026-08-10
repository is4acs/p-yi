"use client";

import { X } from "lucide-react";

import { ActivityDetailContent } from "@/components/activities/ActivityDetailContent";
import type { ActivityDetailState } from "@/components/activities/use-activity-detail";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

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
  return (
    <aside
      aria-label="Détail de l'activité"
      className="absolute bottom-3 left-3 top-3 z-10 hidden w-96 max-w-[calc(100%-1.5rem)] flex-col overflow-hidden rounded-lg border border-border bg-background shadow-lg lg:flex"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Fermer le détail"
        className="absolute right-2 top-2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm backdrop-blur transition hover:bg-accent"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>

      <div className="flex-1 overflow-y-auto p-4">
        {state.status === "loading" && <DetailSkeleton />}
        {state.status === "error" && (
          <div className="flex flex-col items-start gap-3 pt-8">
            <p className="text-sm text-muted-foreground">
              Impossible de charger cette activité.
            </p>
            <Button variant="outline" size="sm" onClick={onClose}>
              Fermer
            </Button>
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
