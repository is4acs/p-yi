"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * BackToTop — remontée rapide en haut du feed.
 *
 * Corollaire direct du feed continu : puisqu'on peut désormais empiler
 * 80 résultats sans changer de page, il faut un moyen de revenir aux
 * filtres et à la barre de recherche sans scroller à la main. Sans ce
 * bouton, le feed continu dégrade la navigation qu'il est censé
 * améliorer.
 *
 * Détails :
 *  - Apparaît après deux hauteurs d'écran — assez bas pour ne jamais
 *    gêner en haut de page, assez tôt pour être là quand on en a besoin.
 *  - Positionné au-dessus de la BottomNav mobile (`bottom-20`) et en
 *    `bottom-6` sur desktop où cette nav n'existe pas.
 *  - `scroll-behavior` respecte `prefers-reduced-motion` : on passe en
 *    saut instantané pour les utilisateurs sensibles au mouvement, chez
 *    qui un défilement animé sur plusieurs écrans peut déclencher un
 *    malaise vestibulaire.
 *  - Le listener de scroll est `passive` pour ne pas retarder le
 *    défilement sur mobile.
 */

const SHOW_AFTER_VIEWPORTS = 2;

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > window.innerHeight * SHOW_AFTER_VIEWPORTS);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function toTop() {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  }

  return (
    <button
      type="button"
      onClick={toTop}
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      className={cn(
        "fixed right-4 bottom-20 z-30 inline-flex h-11 w-11 items-center justify-center rounded-full",
        "border border-border bg-background/95 text-foreground shadow-lg backdrop-blur",
        "transition-[opacity,transform] duration-200 sm:bottom-6",
        "hover:border-peyi-orange-300 hover:text-peyi-orange-700",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peyi-orange-300 focus-visible:ring-offset-2",
        visible
          ? "pointer-events-auto scale-100 opacity-100"
          : "pointer-events-none scale-90 opacity-0",
      )}
    >
      <ArrowUp className="h-5 w-5" aria-hidden />
      <span className="sr-only">Revenir en haut de la page</span>
    </button>
  );
}
