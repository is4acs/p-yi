import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Chip — bouton de filtre toggle-able (catégorie, ville, tri…).
 *
 * Spec handoff Peyi v1.0 :
 *  - État neutre : fond blanc, bordure ink-100, texte ink-700
 *  - État actif : fond ink-900, texte blanc (inversion franche)
 *  - Rayon : full pill (contraste fort avec les cards carrés)
 *  - Taille cible : 44×44px minimum (hit target mobile)
 *  - Font : display 600 13px
 *
 * Diffère volontairement du `Badge variant="outline"` : un Chip est
 * **interactif** (bouton ou lien), un Badge est **informatif** (affiche
 * un état). Ne les confondez pas.
 */
type ChipProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  /** Si renseigné, rend un `<a>` au lieu d'un `<button>` (filtres URL). */
  asLink?: boolean;
};

export const Chip = React.forwardRef<HTMLButtonElement, ChipProps>(
  ({ active = false, className, children, asLink, ...props }, ref) => {
    const classes = cn(
      "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 font-display text-[13px] font-semibold transition-colors duration-base",
      "min-h-[40px]", // hit target mobile
      active
        ? "border-ink-900 bg-ink-900 text-white"
        : "border-ink-100 bg-white text-ink-700 hover:border-peyi-orange-300 hover:text-peyi-orange-700",
      className,
    );
    if (asLink) {
      // On drop `type` (non valide sur <a>) avant de spread sur l'ancre.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
      const { type, ...rest } = props as any;
      return (
        <a
          ref={ref as unknown as React.Ref<HTMLAnchorElement>}
          className={classes}
          {...rest}
        >
          {children}
        </a>
      );
    }
    return (
      <button ref={ref} type="button" className={classes} {...props}>
        {children}
      </button>
    );
  },
);
Chip.displayName = "Chip";
