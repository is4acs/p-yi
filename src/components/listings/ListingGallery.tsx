"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
 *
 * The component is intentionally thin — no lightbox, no pinch-zoom. Those
 * belong to a later polish session ; 90% of the value is having more than
 * one shot visible.
 */
export function ListingGallery({ photos, title, className }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  /* ------------------------------------------------------------------ *
   * Scroll → active index. Throttled via rAF because scroll events fire
   * rapidly during a swipe and we don't want to thrash setState.
   * ------------------------------------------------------------------ */
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
          <div
            key={photo.url}
            className="relative h-full w-full shrink-0 snap-center"
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
          </div>
        ))}
      </div>

      {photos.length > 1 && (
        <>
          {/* Arrows — pointer-only, hidden on touch */}
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

          {/* Counter pill — top-right, small and discreet */}
          <span className="absolute right-2 top-2 inline-flex items-center rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-white tabular-nums backdrop-blur">
            {activeIndex + 1}/{photos.length}
          </span>

          {/* Dots — bottom-center, tap-targeted 24px hit area */}
          <div className="absolute inset-x-0 bottom-2 flex items-center justify-center gap-1.5">
            {photos.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => scrollTo(i)}
                aria-label={`Photo ${i + 1}`}
                className="flex h-6 w-6 items-center justify-center"
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
    </div>
  );
}
