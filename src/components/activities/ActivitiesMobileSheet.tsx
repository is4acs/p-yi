"use client";

import { useEffect, useRef, useState } from "react";
import { Drawer } from "vaul";

import { ActivityCard } from "@/components/activities/ActivityCard";
import type { ActivityFeature } from "@/lib/activities/geojson";

/**
 * Bottom sheet mobile (< lg) de la carte des activités — vaul (la lib du
 * Drawer shadcn), en mode NON-modal et persistant : la carte reste
 * interactive derrière, le sheet ne se ferme jamais, il glisse entre
 * trois positions :
 *
 *  - réduit  (~15 %) : poignée + compteur (la barre de filtres s'y
 *    ajoutera au palier filtres) ;
 *  - moyen   (50 %)  : liste horizontale scrollable de cards ;
 *  - plein   (~94 %) : liste verticale complète.
 *
 * Un tap sur un marqueur remonte le sheet en position moyenne et fait
 * défiler la liste jusqu'à la card correspondante. `handleOnly` : seul
 * la poignée draggue le sheet, pour ne pas se battre avec le scroll
 * interne des listes.
 *
 * z-30 : au-dessus de la carte, sous la BottomNav (z-40) qui doit
 * rester accessible.
 */

const SNAP_COLLAPSED = 0.15;
const SNAP_MID = 0.5;
const SNAP_FULL = 0.94;
const SNAP_POINTS: number[] = [SNAP_COLLAPSED, SNAP_MID, SNAP_FULL];

type Props = {
  features: ActivityFeature[];
  /** false tant que le GeoJSON n'est pas chargé (affiche « Chargement… »). */
  isReady: boolean;
  selectedSlug: string | null;
  onSelect: (slug: string | null) => void;
};

export function ActivitiesMobileSheet({
  features,
  isReady,
  selectedSlug,
  onSelect,
}: Props) {
  const [snap, setSnap] = useState<number | string | null>(SNAP_COLLAPSED);
  const railRefs = useRef(new Map<string, HTMLDivElement>());
  const listRefs = useRef(new Map<string, HTMLDivElement>());

  // Tap sur un marqueur → remonter le sheet (au moins en position
  // moyenne) et scroller les listes vers la card sélectionnée.
  useEffect(() => {
    if (!selectedSlug) return;
    setSnap((current) => (current === SNAP_COLLAPSED ? SNAP_MID : current));
    const frame = requestAnimationFrame(() => {
      railRefs.current
        .get(selectedSlug)
        ?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
      listRefs.current
        .get(selectedSlug)
        ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
    return () => cancelAnimationFrame(frame);
  }, [selectedSlug]);

  const count = features.length;
  const countLabel = isReady
    ? `${count} activité${count > 1 ? "s" : ""} dans cette zone`
    : "Chargement des activités…";

  const isFull = snap === SNAP_FULL;
  const isMid = snap === SNAP_MID;

  return (
    <div className="lg:hidden">
      <Drawer.Root
        open
        modal={false}
        dismissible={false}
        handleOnly
        snapPoints={SNAP_POINTS}
        activeSnapPoint={snap}
        setActiveSnapPoint={setSnap}
      >
        <Drawer.Portal>
          <Drawer.Content
            aria-describedby={undefined}
            className="fixed inset-x-0 bottom-0 z-30 flex h-[94dvh] flex-col rounded-t-lg border-t border-border bg-background shadow-lg outline-none"
          >
            <Drawer.Handle className="mx-auto mt-2.5 h-1.5 w-12 shrink-0 cursor-grab rounded-full bg-ink-200" />
            <Drawer.Title className="sr-only">
              Liste des activités visibles sur la carte
            </Drawer.Title>

            <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-2">
              <p className="text-sm font-semibold">{countLabel}</p>
              {isFull && (
                <button
                  type="button"
                  onClick={() => setSnap(SNAP_COLLAPSED)}
                  className="text-xs font-medium text-peyi-orange-700"
                >
                  Voir la carte
                </button>
              )}
            </div>

            {/* Position moyenne : rail horizontal. */}
            {isMid && (
              <div className="flex gap-2.5 overflow-x-auto px-3 pb-24 pt-1">
                {features.map((feature) => {
                  const slug = feature.properties.slug;
                  return (
                    <div
                      key={slug}
                      className="w-[80vw] max-w-xs shrink-0"
                      ref={(el) => {
                        if (el) railRefs.current.set(slug, el);
                        else railRefs.current.delete(slug);
                      }}
                    >
                      <ActivityCard
                        feature={feature}
                        isSelected={slug === selectedSlug}
                        onClick={() => onSelect(slug)}
                        className="h-full"
                      />
                    </div>
                  );
                })}
                {isReady && count === 0 && (
                  <p className="w-full px-4 py-6 text-center text-sm text-muted-foreground">
                    Aucune activité dans cette zone — déplace la carte ou
                    dézoome.
                  </p>
                )}
              </div>
            )}

            {/* Position pleine : liste verticale scrollable. */}
            {isFull && (
              <div className="flex-1 space-y-2.5 overflow-y-auto px-3 pb-24 pt-1">
                {features.map((feature) => {
                  const slug = feature.properties.slug;
                  return (
                    <div
                      key={slug}
                      ref={(el) => {
                        if (el) listRefs.current.set(slug, el);
                        else listRefs.current.delete(slug);
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
                {isReady && count === 0 && (
                  <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                    Aucune activité dans cette zone — déplace la carte ou
                    dézoome.
                  </p>
                )}
              </div>
            )}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
