"use client";

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";

/**
 * FilterPill — pilule de filtre façon Leboncoin : un bouton pilule qui
 * ouvre un panneau flottant sous lui. Le contenu (rendu serveur) est
 * passé en children — liens de facette ou mini-formulaire GET. Le
 * panneau se ferme au clic extérieur, à Échap, et automatiquement après
 * application d'un filtre (changement d'URL).
 */
export function FilterPill({
  label,
  active = false,
  align = "left",
  children,
}: {
  label: React.ReactNode;
  /** true quand le filtre porté par la pilule est actif (pilule remplie). */
  active?: boolean;
  align?: "left" | "right";
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Fermer après navigation (un lien de facette vient d'être appliqué).
  const urlKey = `${pathname}?${searchParams.toString()}`;
  const lastUrlRef = React.useRef(urlKey);
  React.useEffect(() => {
    if (lastUrlRef.current !== urlKey) {
      lastUrlRef.current = urlKey;
      setOpen(false);
    }
  }, [urlKey]);

  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex min-h-[38px] items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[13px] transition active:scale-95",
          active
            ? "bg-soleil-forest font-bold text-soleil-cream dark:bg-soleil-cream dark:text-soleil-forest"
            : "border-[1.5px] border-soleil-border bg-soleil-input font-semibold text-soleil-forest hover:border-soleil-forest dark:border-soleil-border-d dark:bg-soleil-forest dark:text-soleil-cream dark:hover:border-soleil-cream",
        )}
      >
        {label}
        <span aria-hidden className="text-[11px] opacity-70">
          ▾
        </span>
      </button>
      {open && (
        <div
          className={cn(
            "absolute top-full z-30 mt-2 w-[300px] max-w-[80vw] rounded-[14px] border border-soleil-border bg-soleil-input p-3.5 shadow-xl dark:border-soleil-border-d dark:bg-soleil-forest",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}
