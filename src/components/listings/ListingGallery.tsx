"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";

import { cn } from "@/lib/utils";

type Props = {
  photos: { url: string }[];
  title: string;
  className?: string;
};

/**
 * Galerie multi-photos d'une annonce. Mobile-first :
 *  - Une photo par vue, swipe pour changer (transform index-based, pas
 *    scroll-snap — plus fiable dans un portail Radix)
 *  - Dots de pagination sous l'image
 *  - Flèches gauche/droite ≥ sm
 *  - Tap / clic → lightbox plein écran identique (Esc / tap-outside /
 *    bouton × pour fermer)
 */
export function ListingGallery({ photos, title, className }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const total = photos.length;
  const goTo = useCallback(
    (idx: number) => setActiveIndex(Math.max(0, Math.min(total - 1, idx))),
    [total],
  );

  const swipe = useSwipe({
    total,
    activeIndex,
    onChange: setActiveIndex,
  });

  if (total === 0) return null;

  return (
    <div className={cn("relative", className)}>
      <div
        ref={swipe.containerRef}
        className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-muted sm:aspect-[16/10]"
        onTouchStart={swipe.onTouchStart}
        onTouchMove={swipe.onTouchMove}
        onTouchEnd={swipe.onTouchEnd}
        onTouchCancel={swipe.onTouchEnd}
      >
        <div
          className="flex h-full w-full will-change-transform"
          style={{
            transform: `translate3d(${swipe.translatePct}%, 0, 0)`,
            transition: swipe.isDragging ? "none" : "transform 220ms ease-out",
          }}
        >
          {photos.map((photo, i) => (
            <button
              key={photo.url}
              type="button"
              onClick={() => {
                // Si l'utilisateur vient de swipe, on a posé `suppressTap`
                // dans le hook. Le tap sur la même photo ouvre la lightbox.
                if (swipe.consumeTapSuppression()) return;
                setLightboxIndex(i);
              }}
              aria-label={`Agrandir la photo ${i + 1} sur ${total}`}
              className="relative h-full w-full shrink-0 cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-peyi-orange-500"
            >
              <Image
                src={photo.url}
                alt={`${title} — photo ${i + 1} sur ${total}`}
                fill
                sizes="(max-width: 640px) 100vw, 640px"
                className="object-cover"
                unoptimized
                draggable={false}
                priority={i === 0}
              />
            </button>
          ))}
        </div>
      </div>

      {total > 1 && (
        <>
          <button
            type="button"
            onClick={() => goTo(activeIndex - 1)}
            disabled={activeIndex === 0}
            aria-label="Photo précédente"
            className="absolute left-2 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-black/75 disabled:opacity-40 sm:inline-flex"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => goTo(activeIndex + 1)}
            disabled={activeIndex === total - 1}
            aria-label="Photo suivante"
            className="absolute right-2 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-black/75 disabled:opacity-40 sm:inline-flex"
          >
            <ChevronRight className="h-5 w-5" aria-hidden />
          </button>

          <span className="pointer-events-none absolute right-2 top-2 inline-flex items-center rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-white tabular-nums backdrop-blur">
            {activeIndex + 1}/{total}
          </span>

          <div className="pointer-events-none absolute inset-x-0 bottom-2 flex items-center justify-center gap-1.5">
            {photos.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "block h-1.5 rounded-full transition-all",
                  i === activeIndex ? "w-5 bg-white shadow" : "w-1.5 bg-white/60",
                )}
              />
            ))}
          </div>
        </>
      )}

      <Lightbox
        photos={photos}
        title={title}
        openIndex={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
      />
    </div>
  );
}

type LightboxProps = {
  photos: { url: string }[];
  title: string;
  openIndex: number | null;
  onClose: () => void;
};

function Lightbox({ photos, title, openIndex, onClose }: LightboxProps) {
  const isOpen = openIndex !== null;
  const [activeIndex, setActiveIndex] = useState(0);

  // Re-sync à chaque ouverture : useState conserve la valeur entre les
  // ouvertures si on laissait filer, ce qui faisait "ouvrir toujours sur
  // la dernière photo vue" — contre-intuitif.
  useEffect(() => {
    if (openIndex !== null) setActiveIndex(openIndex);
  }, [openIndex]);

  const total = photos.length;
  const swipe = useSwipe({ total, activeIndex, onChange: setActiveIndex });

  const goTo = useCallback(
    (idx: number) => setActiveIndex(Math.max(0, Math.min(total - 1, idx))),
    [total],
  );

  return (
    <DialogPrimitive.Root
      open={isOpen}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/95 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0" />
        <DialogPrimitive.Content
          className="fixed inset-0 z-50 flex flex-col outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogPrimitive.Title className="sr-only">
            {title} — photos en grand
          </DialogPrimitive.Title>

          <DialogPrimitive.Close
            aria-label="Fermer"
            className="absolute right-3 top-3 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <X className="h-5 w-5" aria-hidden />
          </DialogPrimitive.Close>

          {total > 1 && (
            <span className="pointer-events-none absolute left-1/2 top-3 z-20 inline-flex -translate-x-1/2 items-center rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold text-white tabular-nums backdrop-blur">
              {activeIndex + 1}/{total}
            </span>
          )}

          <div
            ref={swipe.containerRef}
            className="relative h-full w-full overflow-hidden"
            onTouchStart={swipe.onTouchStart}
            onTouchMove={swipe.onTouchMove}
            onTouchEnd={swipe.onTouchEnd}
            onTouchCancel={swipe.onTouchEnd}
          >
            <div
              className="flex h-full w-full will-change-transform"
              style={{
                transform: `translate3d(${swipe.translatePct}%, 0, 0)`,
                transition: swipe.isDragging
                  ? "none"
                  : "transform 220ms ease-out",
              }}
            >
              {photos.map((photo, i) => (
                <div
                  key={photo.url}
                  className="relative flex h-full w-full shrink-0 items-center justify-center"
                >
                  <Image
                    src={photo.url}
                    alt={`${title} — photo ${i + 1} sur ${total}`}
                    fill
                    sizes="100vw"
                    className="object-contain"
                    unoptimized
                    draggable={false}
                    priority={i === openIndex}
                  />
                </div>
              ))}
            </div>
          </div>

          {total > 1 && (
            <>
              <button
                type="button"
                onClick={() => goTo(activeIndex - 1)}
                disabled={activeIndex === 0}
                aria-label="Photo précédente"
                className="absolute left-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/25 disabled:opacity-30 sm:inline-flex"
              >
                <ChevronLeft className="h-6 w-6" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => goTo(activeIndex + 1)}
                disabled={activeIndex === total - 1}
                aria-label="Photo suivante"
                className="absolute right-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/25 disabled:opacity-30 sm:inline-flex"
              >
                <ChevronRight className="h-6 w-6" aria-hidden />
              </button>
            </>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

type UseSwipeArgs = {
  total: number;
  activeIndex: number;
  onChange: (idx: number) => void;
};

/**
 * Hook générique de swipe horizontal index-based. Évite scroll-snap pour
 * bypasser les bugs iOS Safari dans un portail Radix (où scrollLeft peut
 * rester à 0 après un swipe, bloquant la galerie sur la première photo).
 *
 * Retourne : les handlers à poser sur un conteneur, et le % de translation
 * à appliquer sur la track interne (combine l'index courant + le delta de
 * drag en cours pour un suivi du doigt en temps réel).
 */
function useSwipe({ total, activeIndex, onChange }: UseSwipeArgs) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragDx, setDragDx] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const lastDx = useRef(0);
  const suppressTap = useRef(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (total <= 1) return;
    const t = e.touches[0];
    startX.current = t.clientX;
    startY.current = t.clientY;
    lastDx.current = 0;
  }, [total]);

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (startX.current === null || startY.current === null) return;
      const t = e.touches[0];
      const dx = t.clientX - startX.current;
      const dy = t.clientY - startY.current;

      if (!isDragging) {
        // Phase d'ambiguïté : on laisse passer quelques px avant de
        // décider si c'est un swipe horizontal (et qu'on bloque le scroll
        // vertical) ou un scroll vertical (et qu'on abandonne).
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
        if (Math.abs(dx) > Math.abs(dy)) {
          setIsDragging(true);
        } else {
          startX.current = null;
          startY.current = null;
          return;
        }
      }

      if (e.cancelable) e.preventDefault();
      lastDx.current = dx;
      setDragDx(dx);
    },
    [isDragging],
  );

  const onTouchEnd = useCallback(() => {
    if (!isDragging) {
      setDragDx(0);
      startX.current = null;
      startY.current = null;
      return;
    }
    const width = containerRef.current?.clientWidth ?? 0;
    const threshold = Math.min(60, width * 0.2);
    const dx = lastDx.current;
    let next = activeIndex;
    if (dx < -threshold && activeIndex < total - 1) next = activeIndex + 1;
    else if (dx > threshold && activeIndex > 0) next = activeIndex - 1;

    // Si l'utilisateur a bougé de plus de 10 px, on considère que c'était
    // un swipe — on annule donc le prochain tap (ouverture lightbox).
    if (Math.abs(dx) > 10) suppressTap.current = true;

    if (next !== activeIndex) onChange(next);
    setDragDx(0);
    setIsDragging(false);
    startX.current = null;
    startY.current = null;
    lastDx.current = 0;
  }, [activeIndex, isDragging, onChange, total]);

  const consumeTapSuppression = useCallback(() => {
    if (suppressTap.current) {
      suppressTap.current = false;
      return true;
    }
    return false;
  }, []);

  const width = containerRef.current?.clientWidth ?? 0;
  const dragPct = width > 0 ? (dragDx / width) * 100 : 0;
  const translatePct = -(activeIndex * 100) + dragPct;

  return {
    containerRef,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    translatePct,
    isDragging,
    consumeTapSuppression,
  };
}
