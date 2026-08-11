"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";

import { ActivityCard } from "@/components/activities/ActivityCard";
import { ActivityDetailContent } from "@/components/activities/ActivityDetailContent";
import { DetailSkeleton } from "@/components/activities/ActivityDetailPanel";
import type { ActivityDetailState } from "@/components/activities/use-activity-detail";
import type { ActivityFeature } from "@/lib/activities/geojson";
import { cn } from "@/lib/utils";

/**
 * Bottom sheet mobile de la carte des activités — implémentation maison,
 * sans librairie.
 *
 * Pourquoi pas vaul (le Drawer shadcn) : monté en portail sur le <body>, il
 * y posait `pointer-events: none`, ce qui rendait TOUTE la page desktop
 * inerte, y compris quand le sheet était masqué en CSS. Et son mode
 * `snapPoints` translate un panneau de hauteur fixe : le bas du contenu
 * passait sous le viewport et devenait inatteignable au scroll.
 *
 * Ici, deux principes simples qui suppriment ces deux classes de bugs :
 *
 *  1. **Rien n'est monté au-dessus de `lg`** — le composant retourne `null`,
 *     donc zéro effet de bord possible sur le split view desktop.
 *  2. **On anime la HAUTEUR, pas une translation.** Le panneau mesure
 *     exactement ce qui est visible, la zone scrollable est un `flex-1
 *     overflow-y-auto` : le dernier pixel du contenu est toujours
 *     atteignable, quel que soit le palier.
 *
 * Le panneau se place AU-DESSUS de la BottomNav (`bottom-20 sm:bottom-0`,
 * la même réserve que `pb-20 sm:pb-0` du body) : la navigation reste
 * accessible en permanence.
 */

/**
 * Paliers, en pixels, calculés depuis la hauteur réelle du viewport :
 *  - `peek` : en-tête + barre de filtres, la carte reste maîtresse ;
 *  - `half` : moitié d'écran, atteint automatiquement au tap sur un marqueur
 *    (on garde le marqueur visible en même temps que la fiche) ;
 *  - `full` : lecture confortable de la fiche ou de la liste.
 * `RESERVED` correspond au header du site, pour ne jamais le recouvrir.
 */
const RESERVED = 120;

function snapPoints(viewportHeight: number): number[] {
  return [
    136,
    Math.round(viewportHeight * 0.52),
    Math.max(240, viewportHeight - RESERVED),
  ];
}

function nearestSnap(height: number, points: number[]): number {
  return points.reduce((best, point) =>
    Math.abs(point - height) < Math.abs(best - height) ? point : best,
  );
}

type Props = {
  features: ActivityFeature[];
  /** false tant que le GeoJSON n'est pas chargé. */
  isReady: boolean;
  selectedSlug: string | null;
  detail: ActivityDetailState | null;
  onSelect: (slug: string | null) => void;
  /** Barre de filtres (état URL global), visible dès le palier réduit. */
  filterBar?: React.ReactNode;
};

export function ActivitiesMobileSheet({
  features,
  isReady,
  selectedSlug,
  detail,
  onSelect,
  filterBar,
}: Props) {
  const [isMobile, setIsMobile] = useState(false);
  const [points, setPoints] = useState<number[]>(() => snapPoints(800));
  const [height, setHeight] = useState(136);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ startY: number; startHeight: number } | null>(null);
  // Un `click` est toujours émis après un pointerup sur le même élément :
  // sans ce garde-fou, il rejouerait `toggle()` juste après l'aimantation et
  // annulerait le geste de l'utilisateur.
  const movedRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef(new Map<string, HTMLDivElement>());

  // Le sheet n'existe qu'en dessous de `lg`. On s'aligne sur le breakpoint
  // Tailwind (1024px) plutôt que sur une classe CSS, pour que le composant
  // soit réellement démonté et non juste masqué.
  useEffect(() => {
    const query = window.matchMedia("(max-width: 1023px)");
    const sync = () => setIsMobile(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  // Recalcule les paliers au redimensionnement / rotation, et recale la
  // hauteur courante sur le palier le plus proche.
  useEffect(() => {
    const sync = () => {
      const next = snapPoints(window.innerHeight);
      setPoints(next);
      setHeight((current) => nearestSnap(current, next));
    };
    sync();
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
    };
  }, []);

  const showDetail = selectedSlug !== null && detail !== null;

  // Tap sur un marqueur → on remonte à mi-hauteur (le marqueur reste
  // visible au-dessus) et on repart en haut de la fiche, sinon on hérite
  // du scroll de la liste précédente.
  useEffect(() => {
    if (!selectedSlug) return;
    setHeight((current) => (current < points[1] ? points[1] : current));
    scrollRef.current?.scrollTo({ top: 0 });
  }, [selectedSlug, points]);

  // Liste : on amène la carte sélectionnée dans le champ de vision.
  useEffect(() => {
    if (!selectedSlug || showDetail) return;
    cardRefs.current
      .get(selectedSlug)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedSlug, showDetail]);

  // --- Glissement au doigt sur la poignée ------------------------------
  // Pointer Events : un seul code pour le tactile, la souris et le stylet.
  // Pendant le geste on écrit la hauteur brute (transition désactivée), et
  // au relâchement on aimante vers le palier le plus proche.
  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      dragRef.current = { startY: event.clientY, startHeight: height };
      movedRef.current = false;
      setDragging(true);
    },
    [height],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      const drag = dragRef.current;
      if (!drag) return;
      const delta = event.clientY - drag.startY;
      // Seuil de 6 px : en dessous, c'est un tap, pas un glissement.
      if (Math.abs(delta) > 6) movedRef.current = true;
      // Vers le haut = doigt qui monte = panneau qui grandit.
      setHeight(
        Math.min(points[2], Math.max(points[0], drag.startHeight - delta)),
      );
    },
    [points],
  );

  const endDrag = useCallback(() => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setDragging(false);
    setHeight((current) => nearestSnap(current, points));
  }, [points]);

  const expanded = height > points[0] + 8;

  /** Bascule sans impasse : réduit si déployé, ouvre en grand sinon. */
  const toggle = useCallback(() => {
    setHeight((current) => (current > points[0] + 8 ? points[0] : points[2]));
  }, [points]);

  /** Tap sur la poignée — ignoré si l'utilisateur vient de la faire glisser. */
  const onHandleClick = useCallback(() => {
    if (movedRef.current) {
      movedRef.current = false;
      return;
    }
    toggle();
  }, [toggle]);

  if (!isMobile) return null;

  const count = features.length;
  const countLabel = isReady
    ? `${count} activité${count > 1 ? "s" : ""} dans cette zone`
    : "Chargement des activités…";

  return (
    <section
      aria-label="Liste des activités"
      style={{ height }}
      className={cn(
        "fixed inset-x-0 bottom-20 z-30 flex flex-col rounded-t-lg border-t border-border bg-background shadow-lg lg:bottom-0",
        // Pas de transition pendant le glissement : le panneau doit coller
        // au doigt. Elle ne sert qu'à l'aimantation et aux boutons.
        !dragging && "transition-[height] duration-slow ease-out",
      )}
    >
      {/* Poignée : glissable au doigt ET actionnable au tap/clavier — une
          poignée purement tactile serait inutilisable au lecteur d'écran.
          `touch-none` empêche le navigateur de scroller la page pendant le
          geste. */}
      <button
        type="button"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClick={onHandleClick}
        aria-label={expanded ? "Réduire la liste" : "Agrandir la liste"}
        className="flex w-full shrink-0 touch-none items-center justify-center px-4 pb-1.5 pt-3 text-muted-foreground"
      >
        <span
          className="h-1.5 w-12 rounded-full bg-ink-200 transition-colors"
          aria-hidden
        />
      </button>

      <header className="flex shrink-0 items-center justify-between gap-2 px-4 pb-2">
        {showDetail ? (
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-peyi-orange-700"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Retour à la liste
          </button>
        ) : (
          <p className="text-sm font-semibold" aria-live="polite">
            {countLabel}
          </p>
        )}
        <button
          type="button"
          onClick={toggle}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-accent"
          aria-label={expanded ? "Voir la carte" : "Agrandir la liste"}
        >
          {expanded ? (
            <ChevronDown className="h-5 w-5" aria-hidden />
          ) : (
            <ChevronUp className="h-5 w-5" aria-hidden />
          )}
        </button>
      </header>

      {!showDetail && filterBar && (
        <div className="shrink-0 border-b border-border">{filterBar}</div>
      )}

      {/*
        Zone scrollable unique. `overscroll-contain` empêche le scroll de
        « fuir » vers la page derrière une fois arrivé en bout de liste, et
        le padding bas garantit que la dernière carte passe au-dessus du
        bord du panneau.
      */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overscroll-contain px-3 pb-6 pt-2"
      >
        {showDetail ? (
          <>
            {detail.status === "loading" && <DetailSkeleton />}
            {detail.status === "error" && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Impossible de charger cette activité — sélectionne-la à
                nouveau.
              </p>
            )}
            {detail.status === "ready" && (
              <ActivityDetailContent detail={detail.detail} />
            )}
          </>
        ) : count === 0 && isReady ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            Aucune activité dans cette zone — déplace la carte ou dézoome.
          </p>
        ) : (
          <div className="space-y-2.5">
            {features.map((feature) => {
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
                    onClick={() => onSelect(slug)}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
