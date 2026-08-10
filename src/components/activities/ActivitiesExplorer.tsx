"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ActivitiesMobileSheet } from "@/components/activities/ActivitiesMobileSheet";
import { ActivityCard } from "@/components/activities/ActivityCard";
import { ActivityMapSkeleton } from "@/components/activities/ActivityMapSkeleton";
import type { MapBounds } from "@/components/activities/ActivityMap";
import {
  EMPTY_ACTIVITY_COLLECTION,
  type ActivityFeatureCollection,
} from "@/lib/activities/geojson";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// MapLibre casse au SSR (accès à window dès l'import) → chargement
// dynamique client uniquement, avec skeleton pour ne jamais laisser
// d'écran blanc.
const ActivityMap = dynamic(
  () => import("@/components/activities/ActivityMap"),
  { ssr: false, loading: () => <ActivityMapSkeleton /> },
);

/**
 * Orchestrateur client de /activites : un seul fetch du GeoJSON minimal
 * (servi par le CDN, cache 5 min), puis tout — filtre par vue, sélection,
 * synchronisation liste ↔ carte — se joue côté client, sans re-requête.
 *
 * Desktop (≥ lg) : split view — liste 40 % scrollable à gauche, carte
 * 60 % pleine hauteur à droite. Synchronisation bidirectionnelle :
 * hover d'une card → marqueur surélevé ; clic sur un marqueur → scroll
 * de la liste vers la card. Le toggle « Rechercher quand je déplace la
 * carte » (actif par défaut) borne la liste aux limites visibles.
 */
export function ActivitiesExplorer() {
  const [collection, setCollection] =
    useState<ActivityFeatureCollection | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);
  const [bounds, setBounds] = useState<MapBounds | null>(null);
  const [searchOnMove, setSearchOnMove] = useState(true);
  const cardRefs = useRef(new Map<string, HTMLDivElement>());

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

  const visibleFeatures = useMemo(() => {
    const all = collection?.features ?? [];
    if (!searchOnMove || !bounds) return all;
    return all.filter((feature) => {
      const [lng, lat] = feature.geometry.coordinates;
      return (
        lng >= bounds.west &&
        lng <= bounds.east &&
        lat >= bounds.south &&
        lat <= bounds.north
      );
    });
  }, [collection, searchOnMove, bounds]);

  const handleSelect = useCallback((slug: string | null) => {
    setSelectedSlug(slug);
    if (slug) {
      cardRefs.current
        .get(slug)
        ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, []);

  const count = visibleFeatures.length;
  const countLabel = `${count} activité${count > 1 ? "s" : ""}`;

  return (
    <div className="flex h-full w-full">
      {/* ------------------------------------------------------------------
          Liste (desktop ≥ lg) — 40 % de la largeur, scroll indépendant.
          Sur mobile la liste vit dans le bottom sheet (palier suivant).
      ------------------------------------------------------------------ */}
      <section
        aria-label="Liste des activités"
        className="hidden h-full w-2/5 flex-col border-r border-border bg-background lg:flex"
      >
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
          <p className="shrink-0 text-sm font-semibold">
            {collection ? countLabel : "Chargement…"}
          </p>
          <label className="flex cursor-pointer select-none items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={searchOnMove}
              onChange={(event) => setSearchOnMove(event.target.checked)}
              className="h-4 w-4 accent-peyi-orange-500"
            />
            Rechercher quand je déplace la carte
          </label>
        </header>

        <div className="flex-1 space-y-2.5 overflow-y-auto p-3">
          {collection === null && !loadFailed ? (
            Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="flex gap-3 rounded-md border border-border p-2.5">
                <Skeleton className="h-24 w-28 shrink-0 rounded-sm" />
                <div className="flex-1 space-y-2 py-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ))
          ) : count === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-border px-4 py-10 text-center">
              <p className="text-sm text-muted-foreground">
                Aucune activité dans cette zone de la carte.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchOnMove(false)}
              >
                Afficher toute la Guyane
              </Button>
            </div>
          ) : (
            visibleFeatures.map((feature) => {
              const slug = feature.properties.slug;
              return (
                <div
                  key={slug}
                  ref={(el) => {
                    if (el) cardRefs.current.set(slug, el);
                    else cardRefs.current.delete(slug);
                  }}
                >
                  <ActivityCard
                    feature={feature}
                    isSelected={slug === selectedSlug}
                    onClick={() => handleSelect(slug)}
                    onHoverChange={(hovering) =>
                      setHoveredSlug(hovering ? slug : null)
                    }
                  />
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* ------------------------------------------------------------------
          Carte — 60 % desktop, plein écran mobile.
      ------------------------------------------------------------------ */}
      <div className="relative h-full min-w-0 flex-1">
        <ActivityMap
          data={collection ?? EMPTY_ACTIVITY_COLLECTION}
          selectedSlug={selectedSlug}
          hoveredSlug={hoveredSlug}
          onSelect={handleSelect}
          onBoundsChange={setBounds}
        />

        {/* Bandeau d'état par-dessus la carte (erreur / chargement). */}
        {(loadFailed || collection === null) && (
          <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
            {loadFailed ? (
              <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-border bg-background/95 py-1.5 pl-4 pr-1.5 text-sm shadow-md backdrop-blur">
                <span>Impossible de charger les activités.</span>
                <Button size="sm" variant="peyi" onClick={() => void load()}>
                  Réessayer
                </Button>
              </div>
            ) : (
              <div className="rounded-full border border-border bg-background/95 px-4 py-1.5 text-sm text-muted-foreground shadow-md backdrop-blur">
                Chargement des activités…
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom sheet mobile — 3 positions, carte interactive derrière. */}
      <ActivitiesMobileSheet
        features={visibleFeatures}
        isReady={collection !== null}
        selectedSlug={selectedSlug}
        onSelect={handleSelect}
      />
    </div>
  );
}
