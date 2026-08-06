"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * StickyActionBar — barre d'action collée en bas de l'écran sur mobile,
 * pour les pages détail (bon plan, annonce).
 *
 * Le problème qu'elle résout : sur une fiche, l'action principale
 * (« Voir l'offre », « Appeler ») vit à ~1,5 écran du haut, juste sous
 * le prix. Dès que l'utilisateur descend lire la description, les
 * commentaires ou les caractéristiques, le CTA sort du champ — il faut
 * remonter pour agir. C'est exactement le point que Leboncoin et
 * Dealabs traitent avec une barre persistante.
 *
 * Comportement retenu :
 *  - **Mobile uniquement** (`sm:hidden`). Sur desktop la colonne reste
 *    visible sans scroll, la barre n'apporterait rien et mangerait de
 *    la place.
 *  - **Apparition différée** : la barre ne s'affiche que lorsque le CTA
 *    d'origine est sorti du viewport. Tant qu'il est visible, doubler
 *    le bouton serait redondant et masquerait du contenu. On observe
 *    donc l'élément source via `IntersectionObserver`.
 *  - **Au-dessus de la BottomNav ET de son bouton « Poster »**. Le FAB
 *    fait 44px et déborde de 20px au-dessus de la nav (`-mt-5`), donc il
 *    culmine à ~84px du bas : la barre est calée à 88px pour le laisser
 *    passer. Sans ça, sur un écran étroit (360px), le prix viendrait
 *    buter contre le FAB. On respecte aussi `env(safe-area-inset-bottom)`
 *    pour les iPhone à encoche.
 *  - **Transition d'opacité + translation** courte : l'apparition sèche
 *    donne une impression de glitch pendant le scroll.
 *
 * Le contenu (prix, boutons) est passé en `children` et rendu côté
 * serveur : cette enveloppe ne gère que la visibilité.
 */

type Props = {
  /**
   * `id` de l'élément à surveiller (le bloc CTA principal de la page).
   * Tant qu'il est à l'écran, la barre reste masquée.
   */
  watchElementId: string;
  children: React.ReactNode;
};

export function StickyActionBar({ watchElementId, children }: Props) {
  const [visible, setVisible] = useState(false);
  const hasObserved = useRef(false);

  useEffect(() => {
    const target = document.getElementById(watchElementId);
    if (!target || typeof IntersectionObserver === "undefined") {
      // Sans cible ni observer, on préfère afficher la barre : mieux
      // vaut un CTA toujours accessible qu'un CTA jamais visible.
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        hasObserved.current = true;
        setVisible(!entry.isIntersecting);
      },
      { threshold: 0 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [watchElementId]);

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-[5.5rem] z-30 border-y border-border bg-background/95 px-4 py-3 backdrop-blur",
        "supports-[backdrop-filter]:bg-background/85 sm:hidden",
        "transition-[opacity,transform] duration-200",
        visible
          ? "pointer-events-auto translate-y-0 opacity-100"
          : "pointer-events-none translate-y-2 opacity-0",
      )}
      // Masqué de l'arbre a11y tant qu'il est invisible : le CTA source
      // est alors à l'écran, l'annoncer deux fois embrouillerait la
      // navigation au lecteur d'écran.
      aria-hidden={!visible}
    >
      <div className="flex items-center gap-3">{children}</div>
    </div>
  );
}
