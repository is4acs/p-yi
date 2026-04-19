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
 * Horizontal scroll-snap gallery for a listing's photos. Mobile-first :
 *  - One photo per viewport, swipe to change
 *  - Pagination dots under the image
 *  - Left/right arrow buttons visible on ≥ sm screens (hidden on touch)
 *  - Tap / click → lightbox plein écran (Radix Dialog, ferme sur Esc /
 *    tap sur le fond / bouton ×), avec la même mécanique de swipe.
 */
export function ListingGallery({ photos, title, className }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    let raf: number | null = null;
    const onScroll = () => {
      if (raf !== null) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        const w = track.clientWidth || 1;
        const idx = Math.round(track.scrollLeft / w);
        setActiveIndex(Math.max(0, Math.min(photos.length - 1, idx)));
      });
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      track.removeEventListener("scroll", onScroll);
      if (raf !== null) cancelAnimationFrame(raf);
    };
  }, [photos.length]);

  const scrollTo = useCallback((idx: number) => {
    const track = trackRef.current;
    if (!track) return;
    const target = Math.max(0, Math.min(photos.length - 1, idx));
    track.scrollTo({ left: target * track.clientWidth, behavior: "smooth" });
  }, [photos.length]);

  if (photos.length === 0) return null;

  return (
    <div className={cn("relative", className)}>
      <div
        ref={trackRef}
        className="flex aspect-[4/3] w-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden rounded-xl bg-muted scrollbar-hide sm:aspect-[16/10]"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {photos.map((photo, i) => (
          <button
            key={photo.url}
            type="button"
            onClick={() => setLightboxIndex(i)}
            aria-label={`Agrandir la photo ${i + 1} sur ${photos.length}`}
            className="relative h-full w-full shrink-0 cursor-zoom-in snap-center focus:outline-none focus-visible:ring-2 focus-visible:ring-peyi-orange-500"
          >
            <Image
              src={photo.url}
              alt={`${title} — photo ${i + 1} sur ${photos.length}`}
              fill
              sizes="(max-width: 640px) 100vw, 640px"
              className="object-cover"
              unoptimized
              priority={i === 0}
            />
          </button>
        ))}
      </div>

      {photos.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => scrollTo(activeIndex - 1)}
            disabled={activeIndex === 0}
            aria-label="Photo précédente"
            className="absolute left-2 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-black/75 disabled:opacity-40 sm:inline-flex"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => scrollTo(activeIndex + 1)}
            disabled={activeIndex === photos.length - 1}
            aria-label="Photo suivante"
            className="absolute right-2 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-black/75 disabled:opacity-40 sm:inline-flex"
          >
            <ChevronRight className="h-5 w-5" aria-hidden />
          </button>

          <span className="pointer-events-none absolute right-2 top-2 inline-flex items-center rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-white tabular-nums backdrop-blur">
            {activeIndex + 1}/{photos.length}
          </span>

          <div className="pointer-events-none absolute inset-x-0 bottom-2 flex items-center justify-center gap-1.5">
            {photos.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => scrollTo(i)}
                aria-label={`Photo ${i + 1}`}
                className="pointer-events-auto flex h-6 w-6 items-center justify-center"
              >
                <span
                  className={cn(
                    "block h-1.5 rounded-full transition-all",
                    i === activeIndex
                      ? "w-5 bg-white shadow"
                      : "w-1.5 bg-white/60",
                  )}
                />
              </button>
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

/**
 * Vue plein écran. On repasse sur le même pattern scroll-snap pour le swipe
 * natif mobile, et on pré-positionne la track sur l'index cliqué dès que
 * la dialog est montée (layout effect pour éviter un flash sur la photo 0).
 *
 * L'image est affichée en `object-contain` pour voir la photo entière sans
 * crop, sur fond noir type visionneuse.
 */
function Lightbox({ photos, title, openIndex, onClose }: LightboxProps) {
  const isOpen = openIndex !== null;
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(openIndex ?? 0);

  useEffect(() => {
    if (openIndex === null) return;
    setActiveIndex(openIndex);
    // Next tick : attendre que la dialog ait monté la track avant de scroller.
    const id = requestAnimationFrame(() => {
      const track = trackRef.current;
      if (!track) return;
      track.scrollTo({ left: openIndex * track.clientWidth, behavior: "instant" as ScrollBehavior });
    });
    return () => cancelAnimationFrame(id);
  }, [openIndex]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || !isOpen) return;
    let raf: number | null = null;
    const onScroll = () => {
      if (raf !== null) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        const w = track.clientWidth || 1;
        const idx = Math.round(track.scrollLeft / w);
        setActiveIndex(Math.max(0, Math.min(photos.length - 1, idx)));
      });
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      track.removeEventListener("scroll", onScroll);
      if (raf !== null) cancelAnimationFrame(raf);
    };
  }, [photos.length, isOpen]);

  const scrollTo = useCallback(
    (idx: number) => {
      const track = trackRef.current;
      if (!track) return;
      const target = Math.max(0, Math.min(photos.length - 1, idx));
      track.scrollTo({ left: target * track.clientWidth, behavior: "smooth" });
    },
    [photos.length],
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
            className="absolute right-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <X className="h-5 w-5" aria-hidden />
          </DialogPrimitive.Close>

          {photos.length > 1 && (
            <span className="pointer-events-none absolute left-1/2 top-3 z-10 inline-flex -translate-x-1/2 items-center rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold text-white tabular-nums backdrop-blur">
              {activeIndex + 1}/{photos.length}
            </span>
          )}

          <div
            ref={trackRef}
            className="flex h-full w-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden scrollbar-hide"
            style={{ scrollSnapType: "x mandatory" }}
          >
            {photos.map((photo, i) => (
              <div
                key={photo.url}
                className="relative flex h-full w-full shrink-0 snap-center items-center justify-center"
              >
                <Image
                  src={photo.url}
                  alt={`${title} — photo ${i + 1} sur ${photos.length}`}
                  fill
                  sizes="100vw"
                  className="object-contain"
                  unoptimized
                  priority={i === openIndex}
                />
              </div>
            ))}
          </div>

          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => scrollTo(activeIndex - 1)}
                disabled={activeIndex === 0}
                aria-label="Photo précédente"
                className="absolute left-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/25 disabled:opacity-30 sm:inline-flex"
              >
                <ChevronLeft className="h-6 w-6" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => scrollTo(activeIndex + 1)}
                disabled={activeIndex === photos.length - 1}
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
