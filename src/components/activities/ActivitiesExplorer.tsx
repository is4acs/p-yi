"use client";

import dynamic from "next/dynamic";
import { usePathname, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ActivitiesFilterBar } from "@/components/activities/ActivitiesFilterBar";
import { ActivityCard } from "@/components/activities/ActivityCard";
import { ActivityDetailContent } from "@/components/activities/ActivityDetailContent";
import {
  ActivityDetailPanel,
  DetailSkeleton,
} from "@/components/activities/ActivityDetailPanel";
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
 * Deux mises en page, une seule source de vérité :
 *
 *  - **Desktop (≥ lg)** : vue scindée, liste à gauche (40 %), carte à
 *    droite qui occupe toute la hauteur. La page ne défile pas.
 *  - **Mobile** : empilement classique — filtres, carte de hauteur
 *    bornée (45 % de l'écran), puis la liste dans le flux normal. La
 *    page défile comme n'importe quelle autre.
 *
 * Le mobile utilisait auparavant une carte plein écran surmontée d'un
 * panneau glissant. Deux défauts : la carte occupait tout, et comme elle
 * captait les gestes verticaux on se retrouvait à la déplacer en
 * essayant de faire défiler la page. La carte bornée + les gestes
 * coopératifs (un doigt = la page, deux doigts = la carte) suppriment
 * les deux.
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
  const [isMobile, setIsMobile] = useState(false);
  const cardRefs = useRef(new Map<string, HTMLDivElement>());
  const mobilePanelRef = useRef<HTMLElement | null>(null);
  const boundsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // On s'aligne sur le breakpoint Tailwind `lg` (1024 px) plutôt que sur
  // une classe CSS : le mode de gestes de la carte est un comportement
  // JS, il lui faut un booléen, pas une media query dans une feuille.
  useEffect(() => {
    const query = window.matchMedia("(max-width: 1023px)");
    const sync = () => setIsMobile(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

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

  // Mobile : la fiche s'ouvre SOUS la carte. Sans ce recadrage, un tap
  // sur un marqueur ne produirait aucun changement visible — la fiche
  // s'ouvrirait hors écran.
  useEffect(() => {
    if (!selectedSlug || !isMobile) return;
    mobilePanelRef.current?.scrollIntoView({
      block: "start",
      behavior: "smooth",
    });
  }, [selectedSlug, isMobile]);

  const showDetail = selectedSlug !== null && detailState !== null;
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

  const clearFilters = () =>
    applyFilters({
      categories: [],
      citySlug: null,
      accessModes: [],
      price: null,
      duration: null,
      difficulty: null,
      inSeasonNow: false,
    });

  const emptyState =
    activeFilterCount > 0 ? (
      <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-border px-4 py-10 text-center">
        <p className="text-sm text-muted-foreground">
          Aucune activité ne correspond à ces filtres — essaie d&apos;en
          retirer un.
        </p>
        <Button variant="outline" size="sm" onClick={clearFilters}>
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

  const listSkeleton = Array.from({ length: 6 }, (_, i) => (
    <div key={i} className="flex gap-3 rounded-md border border-border p-2.5">
      <Skeleton className="h-24 w-28 shrink-0 rounded-sm" />
      <div className="flex-1 space-y-2 py-1">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  ));

  /**
   * Les deux listes (desktop et mobile) coexistent dans le DOM, l'une
   * masquée en CSS. Seule celle du desktop enregistre ses cartes dans
   * `cardRefs` : si les deux le faisaient, la dernière montée écraserait
   * l'autre et `scrollIntoView` viserait un nœud en `display:none`,
   * c'est-à-dire ne ferait rien. Sur mobile la question ne se pose pas —
   * sélectionner ouvre la fiche à la place de la liste.
   */
  const renderCards = (registerRefs: boolean) =>
    visibleFeatures.map((feature) => {
      const slug = feature.properties.slug;
      return (
        <div
          key={slug}
          ref={
            registerRefs
              ? (el) => {
                  if (el) cardRefs.current.set(slug, el);
                  else cardRefs.current.delete(slug);
                }
              : undefined
          }
        >
          <ActivityCard
            feature={feature}
            isSelected={slug === selectedSlug}
            onClick={() => handleSelect(slug)}
            onHoverChange={(hovering) => setHoveredSlug(hovering ? slug : null)}
          />
        </div>
      );
    });

  return (
    // DOM : liste desktop → filtres mobile → carte → liste mobile.
    // En colonne (mobile) cela donne filtres / carte / liste ; en ligne
    // (desktop) liste | carte, les blocs mobiles étant masqués.
    <div className="flex flex-col lg:h-full lg:flex-row">
      {/* ------------------------------------------------------------------
          Liste desktop — 40 % de la largeur, scroll indépendant.
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
          {collection === null && !loadFailed
            ? listSkeleton
            : count === 0
              ? emptyState
              : renderCards(true)}
        </div>
      </section>

      {/* Filtres mobiles, au-dessus de la carte : on filtre, la carte
          répond juste en dessous. */}
      <div className="border-b border-border bg-background lg:hidden">
        {filterBar}
      </div>

      {/* ------------------------------------------------------------------
          Carte — hauteur bornée sur mobile (elle partage l'écran avec la
          liste), colonne pleine hauteur en desktop.

          `svh` et non `dvh` : la hauteur « petite » du viewport ne bouge
          pas quand la barre d'adresse mobile se rétracte, la carte ne se
          redimensionne donc pas en plein défilement.
      ------------------------------------------------------------------ */}
      <div className="relative h-[45svh] min-h-[260px] w-full shrink-0 lg:h-full lg:min-h-0 lg:w-auto lg:flex-1">
        <ActivityMap
          data={mapData}
          selectedSlug={selectedSlug}
          hoveredSlug={hoveredSlug}
          onSelect={handleSelect}
          onBoundsChange={handleBoundsChange}
          cooperativeGestures={isMobile}
        />

        {/* Panneau détail : desktop uniquement (il porte `hidden lg:flex`),
            flottant au-dessus de la carte. Sur mobile la fiche s'affiche
            à la place de la liste, juste dessous. */}
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
          <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center px-3">
            <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-border bg-background/95 py-1.5 pl-4 pr-1.5 text-sm shadow-md backdrop-blur">
              <span>Impossible de charger les activités.</span>
              <Button size="sm" variant="peyi" onClick={() => void load()}>
                Réessayer
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------
          Liste (ou fiche) mobile, sous la carte, dans le flux de la page.
      ------------------------------------------------------------------ */}
      <section
        ref={mobilePanelRef}
        aria-label="Liste des activités"
        className="scroll-mt-14 bg-background px-3 pb-6 pt-3 lg:hidden"
      >
        {showDetail ? (
          <>
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className="mb-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-peyi-orange-700"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Retour à la liste
            </button>
            {detailState.status === "loading" && <DetailSkeleton />}
            {detailState.status === "error" && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Impossible de charger cette activité — sélectionne-la à
                nouveau.
              </p>
            )}
            {detailState.status === "ready" && (
              <ActivityDetailContent detail={detailState.detail} />
            )}
          </>
        ) : (
          <>
            <header className="mb-3 flex items-center justify-between gap-3">
              {collection ? (
                <p className="text-sm font-semibold" aria-live="polite">
                  {countLabel} dans cette zone
                </p>
              ) : (
                <Skeleton className="h-4 w-40" />
              )}
              {searchOnMove && (
                <button
                  type="button"
                  onClick={() => setSearchOnMove(false)}
                  className="shrink-0 text-xs font-medium text-peyi-orange-700 underline underline-offset-2"
                >
                  Toute la Guyane
                </button>
              )}
            </header>
            <div className="space-y-2.5">
              {collection === null && !loadFailed
                ? listSkeleton
                : count === 0
                  ? emptyState
                  : renderCards(false)}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
