import { FilterPillGroup } from "@/components/shared/FilterPillGroup";
import {
  rankFacetOptions,
  toFilterPills,
  type FacetOption,
} from "@/components/shared/filter-options";
import { buildDealsUrl, type DealsSort } from "@/lib/deals/url";
import { prisma } from "@/lib/prisma";
import { withTimeout } from "@/lib/async/with-timeout";

const FACET_TIMEOUT_MS = 3_500;

type Props = {
  sort: DealsSort;
  categories: FacetOption[];
  cities: FacetOption[];
  selectedCategory: string | null;
  selectedCity: string | null;
  q?: string | null;
};

/**
 * Catégorie + commune des bons plans, en pastilles cliquables dans le
 * drawer de filtres.
 *
 * Avant : un `<form method="get">` avec deux `<select>` et un bouton
 * « Filtrer » — donc un second bouton « Filtrer » à l'intérieur du
 * panneau « Filtres », et des libellés qui se tronquaient l'un l'autre
 * (« Toutes catégo⌄ »). Chaque option est maintenant un lien qui
 * applique directement, comme le tri juste au-dessus.
 *
 * Les comptes sont croisés : le nombre affiché sur chaque commune tient
 * compte de la catégorie sélectionnée, et réciproquement. Ils ignorent
 * en revanche la recherche texte — c'est un repère de volume, pas une
 * pré-visualisation exacte du résultat.
 */
export async function DealsFilterBar({
  sort,
  categories,
  cities,
  selectedCategory,
  selectedCity,
  q,
}: Props) {
  // Un bon plan « actif » = publié et non expiré. `expiresAt: null`
  // (offre sans date de fin) reste compté.
  const activeDeal = {
    status: "PUBLISHED" as const,
    OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
  };

  let categoryCounts = new Map<string, number>();
  let cityCounts = new Map<string, number>();
  let showCounts = false;

  try {
    const [byCategory, byCity] = await withTimeout(
      Promise.all([
        prisma.deal.groupBy({
          by: ["categoryId"],
          where: {
            ...activeDeal,
            ...(selectedCity ? { city: { slug: selectedCity } } : {}),
          },
          _count: { _all: true },
        }),
        prisma.deal.groupBy({
          by: ["cityId"],
          where: {
            ...activeDeal,
            ...(selectedCategory
              ? { category: { slug: selectedCategory } }
              : {}),
          },
          _count: { _all: true },
        }),
      ]),
      FACET_TIMEOUT_MS,
      "deals/filter-facets",
    );

    categoryCounts = new Map(
      byCategory.map((row) => [row.categoryId, row._count._all]),
    );
    cityCounts = new Map(
      byCity.flatMap((row) =>
        row.cityId ? [[row.cityId, row._count._all] as const] : [],
      ),
    );
    showCounts = true;
  } catch (err) {
    // Le comptage n'est qu'un confort : en cas d'échec on rend la liste
    // complète, sans chiffres, plutôt que de casser le drawer.
    // eslint-disable-next-line no-console
    console.error("[deals/filter-bar] facet counts failed", err);
  }

  const categoryPills = toFilterPills(
    rankFacetOptions(categories, categoryCounts, selectedCategory),
    {
      allLabel: "Toutes",
      allHref: buildDealsUrl({ sort, city: selectedCity, q }),
      isAllActive: selectedCategory === null,
      selectedSlug: selectedCategory,
      hrefFor: (slug) =>
        buildDealsUrl({ sort, category: slug, city: selectedCity, q }),
      showCounts,
    },
  );

  const cityPills = toFilterPills(
    rankFacetOptions(cities, cityCounts, selectedCity),
    {
      allLabel: "Toute la Guyane",
      allHref: buildDealsUrl({ sort, category: selectedCategory, q }),
      isAllActive: selectedCity === null,
      selectedSlug: selectedCity,
      hrefFor: (slug) =>
        buildDealsUrl({ sort, category: selectedCategory, city: slug, q }),
      showCounts,
    },
  );

  return (
    <>
      <FilterPillGroup
        id="drawer-deal-category"
        title="Catégorie"
        options={categoryPills}
      />
      <FilterPillGroup
        id="drawer-deal-city"
        title="Commune"
        options={cityPills}
      />
    </>
  );
}
