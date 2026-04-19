"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { DealImagePlaceholder } from "@/components/deals/DealImagePlaceholder";

type Photo = { url: string };

type Props = {
  href: string;
  photos: Photo[];
  coverImageUrl: string | null;
  title: string;
  categoryIcon: string | null;
  sizes: string;
  imageClassName?: string;
  className?: string;
};

/**
 * Carrousel swipeable utilisé dans les cartes d'annonce (liste / grille).
 *
 * Pattern "Avito / Leboncoin" : sur mobile on swipe horizontalement pour
 * cycler entre les photos sans quitter la liste, un tap (sans glissement)
 * navigue vers la page détail. Sur desktop on ajoute des flèches gauche /
 * droite et des dots en bas.
 *
 * Implémentation :
 *  - Index-based transform (translateX) plutôt que scroll-snap : on
 *    garde un contrôle précis du delta de drag et on évite les bugs
 *    croisés browsers où `scrollLeft` ne revient pas (observés sur iOS
 *    Safari dans un portail Radix).
 *  - Touch events : on calcule delta X et Y. Si |Y| domine, on laisse le
 *    navigateur gérer le scroll vertical ; si |X| domine et dépasse un
 *    seuil, on intercepte (preventDefault) et on suit le doigt.
 *  - Tap-vs-drag : si la distance totale reste < 10 px, le touchend
 *    laisse le lien natif se déclencher. Au-delà, on annule la navigation
 *    via `preventDefault` sur le premier click synthétique.
 */
export function ListingCardGallery({
  href,
  photos,
  coverImageUrl,
  title,
  categoryIcon,
  sizes,
  imageClassName,
  className,
}: Props) {
  // Garantit au moins une entrée : si l'annonce n'a que `coverImageUrl`
  // (annonces legacy pré-S15), on le promeut en photo unique pour garder
  // un rendu cohérent sans swipe.
  const items: Photo[] =
    photos.length > 0
      ? photos
      : coverImageUrl
      ? [{ url: coverImageUrl }]
      : [];

  const [activeIndex, setActiveIndex] = useState(0);
  const [dragDx, setDragDx] = useState(0);
  const totalDx = useRef(0);
  const totalDy = useRef(0);
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const isHorizontalDrag = useRef(false);
  const suppressClick = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const commitSwipe = useCallback(
    (dx: number) => {
      const width = containerRef.current?.clientWidth ?? 0;
      // Seuil : 20 % de la largeur OU 50 px — le plus petit gagne, pour
      // qu'un swipe bref suffise sur un écran large comme sur un mobile.
      const threshold = Math.min(50, width * 0.2);
      if (Math.abs(dx) < threshold) return;
      if (dx < 0 && activeIndex < items.length - 1) {
        setActiveIndex(activeIndex + 1);
      } else if (dx > 0 && activeIndex > 0) {
        setActiveIndex(activeIndex - 1);
      }
    },
    [activeIndex, items.length],
  );

  const onTouchStart = (e: React.TouchEvent) => {
    if (items.length <= 1) return;
    const t = e.touches[0];
    startX.current = t.clientX;
    startY.current = t.clientY;
    totalDx.current = 0;
    totalDy.current = 0;
    isHorizontalDrag.current = false;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (items.length <= 1 || startX.current === null || startY.current === null)
      return;
    const t = e.touches[0];
    const dx = t.clientX - startX.current;
    const dy = t.clientY - startY.current;
    totalDx.current = dx;
    totalDy.current = dy;

    // Direction non encore décidée : on laisse passer le 1er tick pour
    // distinguer scroll vertical (liste) vs swipe horizontal (photos).
    if (!isHorizontalDrag.current) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      if (Math.abs(dx) > Math.abs(dy)) {
        isHorizontalDrag.current = true;
      } else {
        // Scroll vertical : on abandonne le tracking pour ne pas gêner la
        // liste qui scrolle, et on garde dragDx à 0.
        startX.current = null;
        startY.current = null;
        return;
      }
    }

    // Empêche la page de scroller tant qu'on suit le doigt horizontalement.
    if (e.cancelable) e.preventDefault();
    setDragDx(dx);
  };

  const onTouchEnd = () => {
    if (!isHorizontalDrag.current) {
      setDragDx(0);
      startX.current = null;
      startY.current = null;
      return;
    }
    // Si on a swipé franchement, on annule le click synthétique qui va
    // suivre (sinon on navigue vers la page détail par erreur).
    if (Math.abs(totalDx.current) > 10) {
      suppressClick.current = true;
    }
    commitSwipe(totalDx.current);
    setDragDx(0);
    startX.current = null;
    startY.current = null;
    isHorizontalDrag.current = false;
  };

  const onClickCapture = (e: React.MouseEvent) => {
    if (suppressClick.current) {
      e.preventDefault();
      e.stopPropagation();
      suppressClick.current = false;
    }
  };

  const goTo = useCallback(
    (idx: number) => {
      setActiveIndex(Math.max(0, Math.min(items.length - 1, idx)));
    },
    [items.length],
  );

  if (items.length === 0) {
    return (
      <Link
        href={href}
        className={cn("relative block h-full w-full active:scale-[0.99]", className)}
      >
        <DealImagePlaceholder
          emoji={categoryIcon}
          label={title}
          className="h-full w-full"
        />
      </Link>
    );
  }

  // Drag offset exprimé en % du conteneur pour un rendu cohérent quelle
  // que soit la taille de la carte (thumbnail 96 px ou tile 5:3 large).
  const width = containerRef.current?.clientWidth ?? 0;
  const dragPct = width > 0 ? (dragDx / width) * 100 : 0;
  const translatePct = -(activeIndex * 100) + dragPct;

  return (
    <div
      ref={containerRef}
      className={cn("relative h-full w-full overflow-hidden", className)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      onClickCapture={onClickCapture}
    >
      <Link
        href={href}
        className="block h-full w-full active:scale-[0.99]"
        draggable={false}
      >
        <div
          className="flex h-full w-full will-change-transform"
          style={{
            transform: `translate3d(${translatePct}%, 0, 0)`,
            transition: dragDx === 0 ? "transform 200ms ease-out" : "none",
          }}
        >
          {items.map((photo, i) => (
            <div key={photo.url} className="relative h-full w-full shrink-0">
              <Image
                src={photo.url}
                alt={i === 0 ? title : `${title} — photo ${i + 1}`}
                fill
                sizes={sizes}
                className={cn("object-cover", imageClassName)}
                unoptimized
                draggable={false}
                priority={i === 0}
              />
            </div>
          ))}
        </div>
      </Link>

      {items.length > 1 && (
        <>
          {/* Flèches desktop (tactile → on les cache, le swipe suffit) */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              goTo(activeIndex - 1);
            }}
            disabled={activeIndex === 0}
            aria-label="Photo précédente"
            className="absolute left-1 top-1/2 z-10 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur transition hover:bg-black/80 disabled:opacity-0 sm:group-hover:inline-flex"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              goTo(activeIndex + 1);
            }}
            disabled={activeIndex === items.length - 1}
            aria-label="Photo suivante"
            className="absolute right-1 top-1/2 z-10 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur transition hover:bg-black/80 disabled:opacity-0 sm:group-hover:inline-flex"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>

          {/* Dots — en bas, compacts pour ne pas cacher la photo */}
          <div className="pointer-events-none absolute inset-x-0 bottom-1 z-10 flex items-center justify-center gap-1">
            {items.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "block h-1 rounded-full transition-all",
                  i === activeIndex ? "w-3 bg-white shadow" : "w-1 bg-white/60",
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
