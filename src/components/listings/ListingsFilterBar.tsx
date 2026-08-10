import { FilterPillGroup } from "@/components/shared/FilterPillGroup";
import {
  rankFacetOptions,
  toFilterPills,
  type FacetOption,
} from "@/components/shared/filter-options";
import {
  buildListingsUrl,
  type ListingsFilters,
  type ListingsSort,
  type ListingTypeSlug,
} from "@/lib/listings/url";
import { prisma } from "@/lib/prisma";
import { withTimeout } from "@/lib/async/with-timeout";

const FACET_TIMEOUT_MS = 3_500;

type Props = {
  sort: ListingsSort;
  categories: FacetOption[];
  cities: FacetOption[];
  selectedCategory: string | null;
  selectedCity: string | null;
  type: ListingTypeSlug | null;
  q?: string | null;
  filters?: ListingsFilters;
};

/**
 * Catégorie + commune des annonces, en pastilles cliquables.
 *
 * Avant : deux `<select>` en `flex-1` plus un bouton submit « Filtrer »,
 * à l'intérieur du panneau « Filtres ». Les libellés se tronquaient
 * mutuellement (« Toutes catégo⌄ ») et le bouton faisait doublon avec
 * « Voir N résultats ». Ici chaque option est un lien qui applique
 * directement — plus de formulaire, donc plus besoin de réémettre les
 * autres filtres en `<input type="hidden">` : `buildListingsUrl` les
 * porte déjà.
 *
 * Comptes croisés catégorie ↔ commune ; la recherche texte et les
 * critères chiffrés ne sont pas pris en compte (repère de volume, pas
 * pré-visualisation exacte).
 */
export async function ListingsFilterBar({
  sort,
  categories,
  cities,
  selectedCategory,
  selectedCity,
  type,
  q,
  filters,
}: Props) {
  const base = { sort, type, q, filters };
  const activeListing = {
    status: "PUBLISHED" as const,
    expiresAt: { gt: new Date() },
  };

  let categoryCounts = new Map<string, number>();
  let cityCounts = new Map<string, number>();
  let showCounts = false;

  try {
    const [byCategory, byCity] = await withTimeout(
      Promise.all([
        prisma.listing.groupBy({
          by: ["categoryId"],
          where: {
            ...activeListing,
            ...(selectedCity ? { city: { slug: selectedCity } } : {}),
          },
          _count: { _all: true },
        }),
        prisma.listing.groupBy({
          by: ["cityId"],
          where: {
            ...activeListing,
            ...(selectedCategory
              ? { category: { slug: selectedCategory } }
              : {}),
          },
          _count: { _all: true },
        }),
      ]),
      FACET_TIMEOUT_MS,
      "listings/filter-facets",
    );

    categoryCounts = new Map(
      byCategory.map((row) => [row.categoryId, row._count._all]),
    );
    cityCounts = new Map(byCity.map((row) => [row.cityId, row._count._all]));
    showCounts = true;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[listings/filter-bar] facet counts failed", err);
  }

  const categoryPills = toFilterPills(
    rankFacetOptions(categories, categoryCounts, selectedCategory),
    {
      allLabel: "Toutes",
      allHref: buildListingsUrl({ ...base, city: selectedCity }),
      isAllActive: selectedCategory === null,
      selectedSlug: selectedCategory,
      hrefFor: (slug) =>
        buildListingsUrl({ ...base, category: slug, city: selectedCity }),
      showCounts,
    },
  );

  const cityPills = toFilterPills(
    rankFacetOptions(cities, cityCounts, selectedCity),
    {
      allLabel: "Toute la Guyane",
      allHref: buildListingsUrl({ ...base, category: selectedCategory }),
      isAllActive: selectedCity === null,
      selectedSlug: selectedCity,
      hrefFor: (slug) =>
        buildListingsUrl({ ...base, category: selectedCategory, city: slug }),
      showCounts,
    },
  );

  return (
    <>
      <FilterPillGroup
        id="drawer-listing-category"
        title="Catégorie"
        options={categoryPills}
      />
      <FilterPillGroup
        id="drawer-listing-city"
        title="Commune"
        options={cityPills}
      />
    </>
  );
}
