"use client";

import dynamic from "next/dynamic";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ActivitiesFilterBar } from "@/components/activities/ActivitiesFilterBar";
import { ActivitiesMobileSheet } from "@/components/activities/ActivitiesMobileSheet";
import { ActivityCard } from "@/components/activities/ActivityCard";
import { ActivityDetailPanel } from "@/components/activities/ActivityDetailPanel";
import { ActivityMapSkeleton } from "@/components/activities/ActivityMapSkeleton";
import type { MapBounds } from "@/components/activities/ActivityMap";
import { useActivityDetail } from "@/components/activities/use-activity-detail";
import {
  countActiveFilters,
  matchesActivityFilters,
  parseActivityFilters,
  writeActivityFilters,
  type ActivityFilters,
} from "@/lib/activities/filters";
import type { ActivityFeatureCollection } from "@/lib/activities/geojson";
import { Skeleton } from "@/components/ui/skeleton";

// MapLibre casse au SSR (accès à window dès l'import) → chargement
// dynamique client uniquement, avec skeleton pour ne jamais laisser
// d'écran blanc.
const ActivityMap = dynamic(
  () => import("@/components/activities/ActivityMap"),
  { ssr: false, loading: () => <ActivityMapSkeleton /> },
);

/**
 * Orchestrateur client de /activites. Un seul fetch du GeoJSON minimal
 * (cache CDN 5 min), puis tout se joue côté client sans re-requête :
 * filtres, bornes de la carte, sélection, synchronisation liste ↔ carte.
 *
 * L'état partageable vit dans l'URL (filtres + `lieu` sélectionné) :
 * coller l'URL dans un autre navigateur reproduit la même vue. Les
 * mises à jour passent par `history.replaceState` — synchronisé avec
 * `useSearchParams` par Next — pour ne déclencher AUCUN aller-retour
 * serveur au clic (précieux en 3G).
 */
export function ActivitiesExplorer() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [collection, setCollection] =
    useState<ActivityFeatureCollection | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);
  const [bounds, setBounds] = useState<MapBounds | null>(null);
  const [searchOnMove, setSearchOnMove] = useState(true);
  const cardRefs = useRef(new Map<string, HTMLDivElement>());

  const filters = useMemo(
    () => parseActivityFilters(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );
  const selectedSlug = searchParams.get("lieu");
  const detailState = useActivityDetail(selectedSlug);
  const activeFilterCount = countActiveFilters(filters);

  const replaceUrl = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      const query = params.toString();
      window.history.replaceState(
        null,
        "",
        query ? `${pathname}?${query}` : pathname,
      );
    },
    [pathname, searchParams],
  );

  const applyFilters = useCallback(
    (next: ActivityFilters) => {
      replaceUrl((params) => writeActivityFilters(params, next));
    },
    [replaceUrl],
  );

  const handleSelect = useCallback(
    (slug: string | null) => {
      replaceUrl((params) => {
        if (slug) params.set("lieu", slug);
        else params.delete("lieu");
      });
      if (slug) {
        cardRefs.current
          .get(slug)
          ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    },
    [replaceUrl],
  );

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

  // Features après filtres URL (Guyane entière) — alimente la carte.
  const filteredFeatures = useMemo(() => {
    const all = collection?.features ?? [];
    if (activeFilterCount === 0) return all;
    return all.filter((feature) =>
      matchesActivityFilters(feature.properties, filters),
    );
  }, [collection, filters, activeFilterCount]);

  const mapData = useMemo<ActivityFeatureCollection>(
    () => ({ type: "FeatureCollection", features: filteredFeatures }),
    [filteredFeatures],
  );

  // Puis restriction aux bornes visibles de la carte — alimente la liste.
  const visibleFeatures = useMemo(() => {
    if (!searchOnMove || !bounds) return filteredFeatures;
    return filteredFeatures.filter((feature) => {
      const [lng, lat] = feature.geometry.coordinates;
      return (
        lng >= bounds.west &&
        lng <= bounds.east &&
        lat >= bounds.south &&
        lat <= bounds.north
      );
    });
  }, [filteredFeatures, searchOnMove, bounds]);

  // Communes proposées dans le filtre = celles présentes dans les données.
  const cities = useMemo(() => {
    const map = new Map<string, string>();
    for (const feature of collection?.features ?? []) {
      map.set(feature.properties.citySlug, feature.properties.cityName);
    }
    return [...map.entries()]
      .map(([slug, name]) => ({ slug, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "fr"));
  }, [collection]);

  // Si un filtre exclut l'activité sélectionnée, on la désélectionne pour
  // ne pas garder un panneau ouvert sur un marqueur disparu.
  useEffect(() => {
    if (!selectedSlug || collection === null) return;
    const stillVisible = filteredFeatures.some(
      (feature) => feature.properties.slug === selectedSlug,
    );
    if (!stillVisible) handleSelect(null);
  }, [selectedSlug, collection, filteredFeatures, handleSelect]);

  const count = visibleFeatures.length;
  const countLabel = `${count} activité${count > 1 ? "s" : ""}`;

  const filterBar = (
    <ActivitiesFilterBar
      filters={filters}
      onChange={applyFilters}
      resultCount={filteredFeatures.length}
      cities={cities}
    />
  );

  const emptyState =
    activeFilterCount > 0 ? (
      <div className="flex flex-col items-center gap-3 rounded-[14px] bg-soleil-sand px-4 py-10 text-center dark:bg-soleil-forest">
        <p className="text-sm text-soleil-body dark:text-soleil-body-d">
          Aucune activité ne correspond à ces filtres — essaie d&apos;en
          retirer un.
        </p>
        <button
          type="button"
          onClick={() =>
            applyFilters({
              categories: [],
              citySlug: null,
              accessModes: [],
              price: null,
              duration: null,
              difficulty: null,
              inSeasonNow: false,
            })
          }
          className="inline-flex min-h-[44px] items-center rounded-full bg-soleil-forest px-4 text-sm font-extrabold text-soleil-cream dark:bg-soleil-cream dark:text-soleil-forest"
        >
          Tout effacer
        </button>
      </div>
    ) : (
      <div className="flex flex-col items-center gap-3 rounded-[14px] bg-soleil-sand px-4 py-10 text-center dark:bg-soleil-forest">
        <p className="text-sm text-soleil-body dark:text-soleil-body-d">
          Aucune activité dans cette zone de la carte.
        </p>
        <button
          type="button"
          onClick={() => setSearchOnMove(false)}
          className="inline-flex min-h-[44px] items-center rounded-full bg-soleil-forest px-4 text-sm font-extrabold text-soleil-cream dark:bg-soleil-cream dark:text-soleil-forest"
        >
          Afficher toute la Guyane
        </button>
      </div>
    );

  return (
    <div className="flex h-full w-full">
      {/* ------------------------------------------------------------------
          Liste (desktop ≥ lg) — 40 % de la largeur, scroll indépendant.
          Sur mobile la liste vit dans le bottom sheet.
      ------------------------------------------------------------------ */}
      <section
        aria-label="Liste des activités"
        className="hidden h-full w-2/5 flex-col border-r border-soleil-line bg-soleil-cream dark:border-soleil-line-d dark:bg-soleil-night lg:flex"
      >
        <div className="border-b border-soleil-line dark:border-soleil-line-d">
          {filterBar}
        </div>
        <header className="flex items-center justify-between gap-3 border-b border-soleil-line px-4 py-2.5 dark:border-soleil-line-d">
          <p className="shrink-0 text-sm font-bold" aria-live="polite">
            {collection ? countLabel : "Chargement…"}
          </p>
          <label className="flex cursor-pointer select-none items-center gap-2 text-xs text-soleil-muted2 dark:text-soleil-muted-d">
            <input
              type="checkbox"
              checked={searchOnMove}
              onChange={(event) => setSearchOnMove(event.target.checked)}
              className="h-4 w-4 accent-soleil-orange"
            />
            Rechercher quand je déplace la carte
          </label>
        </header>

        <div className="flex-1 space-y-2.5 overflow-y-auto p-3">
          {collection === null && !loadFailed ? (
            Array.from({ length: 6 }, (_, i) => (
              <div
                key={i}
                className="flex gap-3 rounded-[14px] border-[1.5px] border-soleil-border p-2.5 dark:border-soleil-border-d"
              >
                <Skeleton className="h-24 w-28 shrink-0 rounded-sm" />
                <div className="flex-1 space-y-2 py-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ))
          ) : count === 0 ? (
            emptyState
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
          data={mapData}
          selectedSlug={selectedSlug}
          hoveredSlug={hoveredSlug}
          onSelect={handleSelect}
          onBoundsChange={setBounds}
        />

        {/* Panneau détail desktop, flottant sur la carte. */}
        {selectedSlug && detailState && (
          <ActivityDetailPanel
            state={detailState}
            onClose={() => handleSelect(null)}
          />
        )}

        {/* Bandeau d'état par-dessus la carte (erreur / chargement). */}
        {(loadFailed || collection === null) && (
          <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
            {loadFailed ? (
              <div className="pointer-events-auto flex items-center gap-2 rounded-full border-[1.5px] border-soleil-border bg-soleil-cream/95 py-1.5 pl-4 pr-1.5 text-sm font-semibold text-soleil-forest shadow-md backdrop-blur dark:border-soleil-border-d dark:bg-soleil-night/95 dark:text-soleil-cream">
                <span>Impossible de charger les activités.</span>
                <button
                  type="button"
                  onClick={() => void load()}
                  className="inline-flex min-h-[36px] items-center rounded-full bg-soleil-forest px-3 text-xs font-extrabold text-soleil-cream dark:bg-soleil-cream dark:text-soleil-forest"
                >
                  Réessayer
                </button>
              </div>
            ) : (
              <div className="rounded-full border-[1.5px] border-soleil-border bg-soleil-cream/95 px-4 py-1.5 text-sm font-semibold text-soleil-muted2 shadow-md backdrop-blur dark:border-soleil-border-d dark:bg-soleil-night/95 dark:text-soleil-muted-d">
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
        detail={detailState}
        onSelect={handleSelect}
        filterBar={filterBar}
      />
    </div>
  );
}
