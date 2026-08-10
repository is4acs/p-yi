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
  const boundsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Débounce du recalcul de liste pendant les déplacements de carte
  // (l'inertie de MapLibre émet des moveend rapprochés). Le filtrage est
  // purement client — le GeoJSON est déjà en mémoire, aucune requête ne
  // part au déplacement, il n'y a donc rien à annuler côté réseau.
  const handleBoundsChange = useCallback((next: MapBounds) => {
    if (boundsTimer.current) clearTimeout(boundsTimer.current);
    boundsTimer.current = setTimeout(() => setBounds(next), 400);
  }, []);

  useEffect(
    () => () => {
      if (boundsTimer.current) clearTimeout(boundsTimer.current);
    },
    [],
  );

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
      <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-border px-4 py-10 text-center">
        <p className="text-sm text-muted-foreground">
          Aucune activité ne correspond à ces filtres — essaie d&apos;en
          retirer un.
        </p>
        <Button
          variant="outline"
          size="sm"
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
        >
          Tout effacer
        </Button>
      </div>
    ) : (
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
    );

  return (
    <div className="flex h-full w-full">
      {/* ------------------------------------------------------------------
          Liste (desktop ≥ lg) — 40 % de la largeur, scroll indépendant.
          Sur mobile la liste vit dans le bottom sheet.
      ------------------------------------------------------------------ */}
      <section
        aria-label="Liste des activités"
        className="hidden h-full w-2/5 flex-col border-r border-border bg-background lg:flex"
      >
        <div className="border-b border-border">{filterBar}</div>
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
          {collection ? (
            <p className="shrink-0 text-sm font-semibold" aria-live="polite">
              {countLabel}
            </p>
          ) : (
            // Un SEUL message de chargement sur la page (celui de la
            // carte) — ici, un simple skeleton.
            <Skeleton className="h-4 w-24 shrink-0" />
          )}
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
          onBoundsChange={handleBoundsChange}
        />

        {/* Panneau détail desktop, flottant sur la carte. */}
        {selectedSlug && detailState && (
          <ActivityDetailPanel
            state={detailState}
            onClose={() => handleSelect(null)}
          />
        )}

        {/* Bandeau d'erreur par-dessus la carte. Pas de pastille de
            chargement ici : le skeleton de la carte et ceux de la liste
            portent déjà l'état — trois messages empilés au premier
            rendu, c'était du bruit. */}
        {loadFailed && (
          <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
            <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-border bg-background/95 py-1.5 pl-4 pr-1.5 text-sm shadow-md backdrop-blur">
              <span>Impossible de charger les activités.</span>
              <Button size="sm" variant="peyi" onClick={() => void load()}>
                Réessayer
              </Button>
            </div>
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
