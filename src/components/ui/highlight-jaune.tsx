import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * HighlightJaune — surlignage "marker jaune" derrière un mot-clé.
 *
 * Transcription du pattern `.hl-jaune` du handoff Péyi v1.0
 * (`typography.css`) :
 *
 * ```css
 * .hl-jaune { position: relative; display: inline-block; }
 * .hl-jaune::before {
 *   content: ""; position: absolute; left: -2px; right: -2px; bottom: 2px;
 *   height: 0.35em; background: var(--peyi-jaune); z-index: -1;
 *   border-radius: 4px;
 * }
 * ```
 *
 * Pourquoi un composant plutôt qu'une classe utilitaire globale ? Le
 * `::before` + `z-index: -1` oblige à contrôler le stacking context du
 * parent. En passant par un composant, l'effet est encapsulé et on
 * garde une API propre (`<HighlightJaune>Guyane</HighlightJaune>`).
 *
 * Usage canonique : mot-clé final d'un titre hero, ou mot qu'on veut
 * signer "Péyi". À utiliser avec parcimonie — 1 par page max, sinon
 * l'effet signature se dilue.
 *
 * A11y : purement visuel. Aucun `aria-*`, le texte reste lisible par
 * les lecteurs d'écran (le `::before` est décoratif).
 */

type Props = React.HTMLAttributes<HTMLSpanElement> & {
  children: React.ReactNode;
};

export function HighlightJaune({ children, className, ...rest }: Props) {
  return (
    <span
      {...rest}
      className={cn(
        // Stacking context : relative + isolate pour que le `-z-10` du
        // ::before ne passe PAS derrière un éventuel fond du parent
        // (sans `isolate`, le ::before finit derrière le body et on ne
        // le voit plus — bug classique des pseudo-éléments négatifs).
        "relative isolate inline-block",
        // Le pseudo-élément reproduit la CSS du handoff à l'identique :
        // - `-left-[2px] -right-[2px]` = débordement latéral de 2px
        //   pour que le surlignage dépasse les bords de la lettre.
        // - `bottom-[2px]` = remonte la barre de 2px pour qu'elle
        //   passe derrière la moitié basse du mot (effet marker).
        // - `h-[0.35em]` = hauteur relative à la font-size (s'adapte
        //   aux différentes tailles de texte).
        "before:absolute before:-left-[2px] before:-right-[2px] before:bottom-[2px]",
        "before:-z-10 before:h-[0.35em] before:rounded before:bg-peyi-jaune before:content-['']",
        className,
      )}
    >
      {children}
    </span>
  );
}
