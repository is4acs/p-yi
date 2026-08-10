import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * FilterPillGroup — un groupe de filtres dans le drawer : un titre, puis
 * des pastilles qui passent à la ligne.
 *
 * Remplace les `<select>` natifs qui traînaient dans le drawer. Deux
 * raisons de les avoir retirés :
 *
 *  1. Ils venaient avec leur propre bouton « Filtrer » (submit du
 *     formulaire), donc un bouton « Filtrer » DANS le panneau
 *     « Filtres », à côté de « Voir N résultats ». Trois façons de faire
 *     la même chose sur un écran de 390 px.
 *  2. Côte à côte en `flex-1`, ils tronquaient leur propre libellé —
 *     « Toutes catégo⌄ », « Toutes comm⌄ ».
 *
 * Ici chaque option est un `<Link>` : le clic applique le filtre, le
 * drawer reste ouvert, et le libellé complet est toujours lisible. C'est
 * aussi la même grammaire visuelle que « Trier » et « Type d'annonce »,
 * qui étaient déjà des pastilles — le panneau se lit d'un bloc.
 *
 * `wrap` plutôt que scroll horizontal : dans un panneau, un rail qui
 * défile cache des options sans le dire. On a la largeur, on l'utilise.
 */

export type FilterPillOption = {
  /** Clé React. */
  key: string;
  label: string;
  href: string;
  isActive: boolean;
  /** Emoji de catégorie, affiché avant le libellé. */
  icon?: string | null;
  /** Nombre de résultats. Omis = pas de compteur (jamais « 0 » factice). */
  count?: number;
};

type Props = {
  /** Titre du groupe — rendu en `<h3>`, sert d'étiquette a11y au groupe. */
  title: string;
  id: string;
  options: FilterPillOption[];
  /** Teinte de l'état actif. Classes écrites en toutes lettres : une
   *  classe Tailwind construite dynamiquement serait purgée au build. */
  accent?: "orange" | "green";
};

const ACTIVE_CLASS = {
  orange: "border-peyi-orange-500 bg-peyi-orange-500 text-white shadow-brand",
  green: "border-peyi-green-500 bg-peyi-green-500 text-white",
} as const;

const HOVER_CLASS = {
  orange: "hover:border-peyi-orange-300 hover:text-peyi-orange-700",
  green: "hover:border-peyi-green-300 hover:text-peyi-green-700",
} as const;

export function FilterPillGroup({
  title,
  id,
  options,
  accent = "orange",
}: Props) {
  if (options.length === 0) return null;

  return (
    <section aria-labelledby={id}>
      <h3
        id={id}
        className="mb-2.5 font-display text-sm font-semibold text-ink-900"
      >
        {title}
      </h3>
      <ul className="flex flex-wrap gap-2">
        {options.map((option) => (
          <li key={option.key}>
            <Link
              href={option.href}
              scroll={false}
              aria-current={option.isActive ? "page" : undefined}
              className={cn(
                // `min-h-9` + padding généreux : cible tactile confortable
                // sans imposer la hauteur 44 px à toutes les pastilles,
                // qui feraient exploser la hauteur du panneau.
                "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peyi-orange-300 focus-visible:ring-offset-2",
                option.isActive
                  ? ACTIVE_CLASS[accent]
                  : cn(
                      "border-border bg-background text-foreground",
                      HOVER_CLASS[accent],
                    ),
              )}
            >
              {option.icon && (
                <span aria-hidden className="text-base leading-none">
                  {option.icon}
                </span>
              )}
              <span>{option.label}</span>
              {option.count !== undefined && (
                <span
                  className={cn(
                    "font-mono text-xs tabular-nums",
                    option.isActive ? "text-white/75" : "text-ink-500",
                  )}
                >
                  {option.count}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
