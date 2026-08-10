import type { FilterPillOption } from "@/components/shared/FilterPillGroup";

/**
 * Préparation des options de facette (catégorie, commune) affichées dans
 * le drawer de filtres.
 *
 * Le problème réglé ici : la liste des communes sortait de
 * `city.findMany()` triée par nom, donc Apatou, Awala-Yalimapo et Camopi
 * ouvraient le bal — trois communes sans un seul contenu — pendant que
 * Cayenne se trouvait au milieu du paquet. Vingt-deux pastilles dont
 * dix-sept mènent à « aucun résultat », c'est très exactement la façon
 * de se perdre.
 *
 * On ne garde donc que les options qui ont au moins un résultat, triées
 * par volume décroissant, et on affiche le compte.
 */

export type FacetOption = {
  id: string;
  slug: string;
  name: string;
  icon?: string | null;
};

export type RankedFacetOption = FacetOption & { count: number };

/**
 * Trie par volume décroissant et retire les options vides.
 *
 * L'option sélectionnée est TOUJOURS conservée, même à zéro : sans ce
 * garde-fou, filtrer sur une commune dont le dernier contenu vient
 * d'expirer ferait disparaître la pastille active, et l'utilisateur
 * n'aurait plus aucun moyen de comprendre — ni d'annuler — le filtre
 * qu'il subit.
 *
 * Si le comptage a échoué (map vide), on rend la liste complète non
 * triée plutôt qu'un filtre vide : dégrader vers « tout » vaut mieux
 * que vers « rien ».
 */
export function rankFacetOptions(
  options: FacetOption[],
  countById: Map<string, number>,
  selectedSlug: string | null,
): RankedFacetOption[] {
  if (countById.size === 0) {
    return options.map((option) => ({ ...option, count: 0 }));
  }

  return options
    .map((option) => ({ ...option, count: countById.get(option.id) ?? 0 }))
    .filter((option) => option.count > 0 || option.slug === selectedSlug)
    .sort(
      (a, b) => b.count - a.count || a.name.localeCompare(b.name, "fr"),
    );
}

/**
 * Convertit les options classées en pastilles, précédées d'une entrée
 * « tout » qui retire le filtre.
 *
 * `showCounts` est faux quand la requête de comptage a échoué : on
 * préfère aucune pastille chiffrée à des « 0 » partout, qui laisseraient
 * croire que le site est vide.
 */
export function toFilterPills(
  options: RankedFacetOption[],
  {
    allLabel,
    allHref,
    isAllActive,
    selectedSlug,
    hrefFor,
    showCounts,
  }: {
    allLabel: string;
    allHref: string;
    isAllActive: boolean;
    selectedSlug: string | null;
    hrefFor: (slug: string) => string;
    showCounts: boolean;
  },
): FilterPillOption[] {
  return [
    {
      key: "all",
      label: allLabel,
      href: allHref,
      isActive: isAllActive,
    },
    ...options.map((option) => ({
      key: option.slug,
      label: option.name,
      icon: option.icon,
      href: hrefFor(option.slug),
      isActive: selectedSlug === option.slug,
      count: showCounts ? option.count : undefined,
    })),
  ];
}
