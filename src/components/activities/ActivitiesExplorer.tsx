"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";

import { ActivityMapSkeleton } from "@/components/activities/ActivityMapSkeleton";
import {
  EMPTY_ACTIVITY_COLLECTION,
  type ActivityFeatureCollection,
} from "@/lib/activities/geojson";
import { Button } from "@/components/ui/button";

// MapLibre casse au SSR (accès à window dès l'import) → chargement
// dynamique client uniquement, avec skeleton pour ne jamais laisser
// d'écran blanc.
const ActivityMap = dynamic(
  () => import("@/components/activities/ActivityMap"),
  { ssr: false, loading: () => <ActivityMapSkeleton /> },
);

/**
 * Orchestrateur client de la page /activites : charge le GeoJSON minimal
 * une seule fois (le CDN le sert en cache 5 min), tient l'état de
 * sélection et le passe à la carte.
 */
export function ActivitiesExplorer() {
  const [collection, setCollection] =
    useState<ActivityFeatureCollection | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [hoveredSlug] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadFailed(false);
    try {
      const response = await fetch("/api/activites/geojson", {
        headers: { accept: "application/json" },
      });
      if (!response.ok) throw new Error(`geojson HTTP ${response.status}`);
      setCollection((await response.json()) as ActivityFeatureCollection);
    } catch {
      setLoadFailed(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const count = collection?.features.length ?? null;

  return (
    <div className="relative h-full w-full">
      <ActivityMap
        data={collection ?? EMPTY_ACTIVITY_COLLECTION}
        selectedSlug={selectedSlug}
        hoveredSlug={hoveredSlug}
        onSelect={setSelectedSlug}
      />

      {/* Compteur / états de chargement par-dessus la carte. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
        {loadFailed ? (
          <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-border bg-background/95 py-1.5 pl-4 pr-1.5 text-sm shadow-md backdrop-blur">
            <span>Impossible de charger les activités.</span>
            <Button size="sm" variant="peyi" onClick={() => void load()}>
              Réessayer
            </Button>
          </div>
        ) : count === null ? (
          <div className="rounded-full border border-border bg-background/95 px-4 py-1.5 text-sm text-muted-foreground shadow-md backdrop-blur">
            Chargement des activités…
          </div>
        ) : (
          <div className="rounded-full border border-border bg-background/95 px-4 py-1.5 text-sm font-medium shadow-md backdrop-blur">
            {count} activité{count > 1 ? "s" : ""} en Guyane
          </div>
        )}
      </div>
    </div>
  );
}
