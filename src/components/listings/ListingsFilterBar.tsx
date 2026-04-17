import Link from "next/link";
import {
  buildListingsUrl,
  type ListingsFilters,
  type ListingsSort,
  type ListingTypeSlug,
} from "@/lib/listings/url";

type Option = { slug: string; name: string; icon?: string | null };

type Props = {
  sort: ListingsSort;
  categories: Option[];
  cities: Option[];
  selectedCategory: string | null;
  selectedCity: string | null;
  type: ListingTypeSlug | null;
  q?: string | null;
  filters?: ListingsFilters;
};

/**
 * Map des clés `ListingsFilters` vers leur nom URL. Utilisé pour émettre
 * les hidden inputs qui préservent les filtres pendant une soumission
 * catégorie / ville — sinon ils seraient perdus au premier submit.
 */
const FILTER_URL_KEYS: Array<[keyof ListingsFilters, string]> = [
  ["priceMin", "prixMin"],
  ["priceMax", "prixMax"],
  ["yearMin", "anneeMin"],
  ["kmMax", "kmMax"],
  ["surfaceMin", "surfaceMin"],
  ["rooms", "pieces"],
  ["fuel", "carburant"],
  ["brand", "marque"],
  ["contract", "contrat"],
];

export function ListingsFilterBar({
  sort,
  categories,
  cities,
  selectedCategory,
  selectedCity,
  type,
  q,
  filters,
}: Props) {
  const hasFilter = Boolean(selectedCategory || selectedCity);

  return (
    <form
      action="/annonces"
      method="get"
      className="flex flex-wrap items-center gap-2"
    >
      {sort !== "new" && <input type="hidden" name="sort" value={sort} />}
      {type && <input type="hidden" name="type" value={type} />}
      {q && <input type="hidden" name="q" value={q} />}
      {filters &&
        FILTER_URL_KEYS.map(([k, urlKey]) => {
          const value = filters[k];
          if (value == null || value === "") return null;
          return (
            <input
              key={urlKey}
              type="hidden"
              name={urlKey}
              value={String(value)}
            />
          );
        })}

      <label className="sr-only" htmlFor="filter-lcategory">
        Catégorie
      </label>
      <select
        id="filter-lcategory"
        name="category"
        defaultValue={selectedCategory ?? ""}
        className="h-9 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-sm text-foreground focus:border-peyi-orange-500 focus:outline-none focus:ring-1 focus:ring-peyi-orange-500"
      >
        <option value="">Toutes catégories</option>
        {categories.map((c) => (
          <option key={c.slug} value={c.slug}>
            {c.icon ? `${c.icon} ` : ""}
            {c.name}
          </option>
        ))}
      </select>

      <label className="sr-only" htmlFor="filter-lcity">
        Commune
      </label>
      <select
        id="filter-lcity"
        name="city"
        defaultValue={selectedCity ?? ""}
        className="h-9 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-sm text-foreground focus:border-peyi-orange-500 focus:outline-none focus:ring-1 focus:ring-peyi-orange-500"
      >
        <option value="">Toutes communes</option>
        {cities.map((c) => (
          <option key={c.slug} value={c.slug}>
            {c.name}
          </option>
        ))}
      </select>

      <button
        type="submit"
        className="h-9 rounded-md bg-peyi-orange-500 px-3 text-sm font-semibold text-white transition hover:bg-peyi-orange-600"
      >
        Filtrer
      </button>

      {hasFilter && (
        <Link
          href={buildListingsUrl({ sort, type, q, filters })}
          className="h-9 rounded-md border border-border px-3 text-sm font-medium leading-9 text-muted-foreground hover:text-foreground"
        >
          Effacer
        </Link>
      )}
    </form>
  );
}
