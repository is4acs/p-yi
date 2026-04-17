import Link from "next/link";
import { buildDealsUrl, type DealsSort } from "@/lib/deals/url";

type Option = { slug: string; name: string; icon?: string | null };

type Props = {
  sort: DealsSort;
  categories: Option[];
  cities: Option[];
  selectedCategory: string | null;
  selectedCity: string | null;
};

export function DealsFilterBar({
  sort,
  categories,
  cities,
  selectedCategory,
  selectedCity,
}: Props) {
  const hasFilter = Boolean(selectedCategory || selectedCity);

  return (
    <form
      action="/bons-plans"
      method="get"
      className="flex flex-wrap items-center gap-2"
    >
      {sort !== "hot" && <input type="hidden" name="sort" value={sort} />}

      <label className="sr-only" htmlFor="filter-category">
        Catégorie
      </label>
      <select
        id="filter-category"
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

      <label className="sr-only" htmlFor="filter-city">
        Commune
      </label>
      <select
        id="filter-city"
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
          href={buildDealsUrl({ sort })}
          className="h-9 rounded-md border border-border px-3 text-sm font-medium leading-9 text-muted-foreground hover:text-foreground"
        >
          Effacer
        </Link>
      )}
    </form>
  );
}
