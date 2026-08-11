import type { Metadata } from "next";
import Link from "next/link";

import { prisma } from "@/lib/prisma";
import {
  fetchListingsPage,
  fetchUserFavoriteListingSet,
  PAGE_SIZE,
} from "@/lib/listings/queries";
import {
  hasActiveFilters,
  parseFilters,
  parsePage,
  parseQuery,
  parseSort,
  parseType,
} from "@/lib/listings/url";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getListingsFacetCanonicalPath } from "@/lib/seo/local-pages";
import { ListingCardTile } from "@/components/listings/ListingCardTile";
import { ListingsPagination } from "@/components/listings/ListingsPagination";
import { EmptyListings } from "@/components/listings/EmptyListings";
import { CountLine } from "@/components/soleil/CountLine";
import { FilterSelect } from "@/components/soleil/FilterSelect";
import { SearchField } from "@/components/soleil/SearchField";
import { Sun } from "@/components/soleil/Sun";
import { TabsPeyi } from "@/components/soleil/TabsPeyi";
import { withTimeout } from "@/lib/async/with-timeout";
import { getMessages, tFormat } from "@/lib/i18n";

export const dynamic = "force-dynamic";
const METADATA_TIMEOUT_MS = 2_000;
const PAGE_DATA_TIMEOUT_MS = 4_500;

type SearchParams = {
  sort?: string;
  category?: string;
  city?: string;
  type?: string;
  page?: string;
  q?: string;
  prixMin?: string;
  prixMax?: string;
  anneeMin?: string;
  kmMax?: string;
  surfaceMin?: string;
  pieces?: string;
  carburant?: string;
  marque?: string;
  contrat?: string;
};

/**
 * Même logique que `/bons-plans` : on résout les slugs en noms
 * humains pour un titre SEO de qualité. Cf.
 * `src/app/bons-plans/page.tsx::resolveFacets` pour la justification.
 */
async function resolveFacets(
  categorySlug: string | null,
  citySlug: string | null,
) {
  try {
    const [category, city] = await withTimeout(
      Promise.all([
        categorySlug
          ? prisma.category.findUnique({
              where: { slug: categorySlug },
              select: { name: true },
            })
          : null,
        citySlug
          ? prisma.city.findUnique({
              where: { slug: citySlug },
              select: { name: true },
            })
          : null,
      ]),
      METADATA_TIMEOUT_MS,
      "listings/metadata-facets",
    );
    return {
      categoryName: category?.name ?? categorySlug ?? null,
      cityName: city?.name ?? citySlug ?? null,
    };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[listings/metadata] facet resolution failed", {
      categorySlug,
      citySlug,
      err,
    });
    return {
      categoryName: categorySlug ?? null,
      cityName: citySlug ?? null,
    };
  }
}

export async function generateMetadata(
  props: {
    searchParams: Promise<SearchParams>;
  }
): Promise<Metadata> {
  const searchParams = await props.searchParams;
  const q = parseQuery(searchParams.q);
  const sort = parseSort(searchParams.sort);
  const page = parsePage(searchParams.page);
  const type = parseType(searchParams.type);
  const categorySlug = searchParams.category?.trim() || null;
  const citySlug = searchParams.city?.trim() || null;
  const filters = parseFilters(searchParams);

  // Toutes les vues filtrées/recherchées restent noindex pour éviter
  // l'indexation de variantes combinatoires. Les pages piliers propres
  // portent la visibilité locale.
  const hasFacet = Boolean(categorySlug || citySlug);
  const hasQueryVariant =
    Boolean(q) ||
    sort !== "new" ||
    page > 1 ||
    Boolean(type) ||
    hasActiveFilters(filters);
  const isFilteredView = hasFacet || hasQueryVariant;
  const facetCanonical =
    getListingsFacetCanonicalPath({ categorySlug, citySlug }) ?? "/annonces";

  const { categoryName, cityName } = await resolveFacets(
    categorySlug,
    citySlug,
  );

  const parts: string[] = [];
  if (categoryName) parts.push(categoryName);
  if (cityName) parts.push(cityName);

  if (parts.length > 0) {
    const label = parts.join(" · ");
    const title = `Annonces ${label}`;
    const description = `Les petites annonces ${label.toLowerCase()} en Guyane sur Péyi. Achète, vends, échange entre Guyanais.`;
    return {
      title,
      description,
      alternates: { canonical: facetCanonical },
      robots: { index: !isFilteredView, follow: true },
      openGraph: { title, description, url: facetCanonical },
      twitter: { title, description, card: "summary_large_image" },
    };
  }

  const title = "Petites annonces de Guyane";
  const description =
    "Achète, vends, échange et donne entre Guyanais. Petites annonces locales sur Péyi.";
  return {
    title,
    description,
    alternates: { canonical: "/annonces" },
    robots: { index: true, follow: true },
    openGraph: { title, description, url: "/annonces" },
    twitter: { title, description, card: "summary_large_image" },
  };
}

export default async function AnnoncesPage(
  props: {
    searchParams: Promise<SearchParams>;
  }
) {
  const searchParams = await props.searchParams;
  const t = await getMessages();
  const sort = parseSort(searchParams.sort);
  const page = parsePage(searchParams.page);
  const type = parseType(searchParams.type);
  const category = searchParams.category?.trim() || null;
  const city = searchParams.city?.trim() || null;
  const q = parseQuery(searchParams.q);
  const filters = parseFilters(searchParams);

  const [listingsResult, categoriesResult, citiesResult, currentUserResult] =
    await Promise.allSettled([
      withTimeout(
        fetchListingsPage({ sort, page, category, city, type, q, filters }),
        PAGE_DATA_TIMEOUT_MS,
        "listings/page-list",
      ),
      withTimeout(
        prisma.category.findMany({
          where: { type: { in: ["LISTING", "BOTH"] }, isActive: true },
          orderBy: { sortOrder: "asc" },
          select: { slug: true, name: true, icon: true },
        }),
        PAGE_DATA_TIMEOUT_MS,
        "listings/page-categories",
      ),
      withTimeout(
        prisma.city.findMany({
          orderBy: { name: "asc" },
          select: { slug: true, name: true },
        }),
        PAGE_DATA_TIMEOUT_MS,
        "listings/page-cities",
      ),
      withTimeout(
        getCurrentUser(),
        PAGE_DATA_TIMEOUT_MS,
        "listings/page-current-user",
      ),
    ]);

  const listingsPayload =
    listingsResult.status === "fulfilled"
      ? listingsResult.value
      : { listings: [], total: 0 };
  const listings = listingsPayload.listings;
  const total = listingsPayload.total;

  const categories =
    categoriesResult.status === "fulfilled" ? categoriesResult.value : [];
  const cities = citiesResult.status === "fulfilled" ? citiesResult.value : [];
  const currentUser =
    currentUserResult.status === "fulfilled" ? currentUserResult.value : null;

  const hasDataLoadIssue =
    listingsResult.status === "rejected" ||
    categoriesResult.status === "rejected" ||
    citiesResult.status === "rejected" ||
    currentUserResult.status === "rejected";

  if (hasDataLoadIssue) {
    // eslint-disable-next-line no-console
    console.error("[annonces/page] partial data load failure", {
      listings:
        listingsResult.status === "rejected"
          ? listingsResult.reason
          : undefined,
      categories:
        categoriesResult.status === "rejected"
          ? categoriesResult.reason
          : undefined,
      cities:
        citiesResult.status === "rejected" ? citiesResult.reason : undefined,
      currentUser:
        currentUserResult.status === "rejected"
          ? currentUserResult.reason
          : undefined,
    });
  }

  const listingIds = listings.map((l) => l.id);
  let favoriteSet = new Set<string>();
  try {
    favoriteSet = await withTimeout(
      fetchUserFavoriteListingSet(currentUser?.id ?? null, listingIds),
      PAGE_DATA_TIMEOUT_MS,
      "listings/page-favorites",
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[annonces/page] favorite set load failed", err);
  }

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters =
    Boolean(category || city || type || q) || hasActiveFilters(filters);
  const cityName = city
    ? cities.find((c) => c.slug === city)?.name ?? city
    : null;

  // Paramètres bruts à préserver quand un formulaire ne contrôle qu'une
  // partie des filtres (les chips pilotent sort/category/city/prixMax,
  // la recherche pilote q — tout le reste passe en input hidden).
  const rawParams = Object.entries(searchParams).filter(
    (entry): entry is [string, string] =>
      typeof entry[1] === "string" && entry[1] !== "",
  );
  const chipsHidden = rawParams.filter(
    ([key]) => !["sort", "category", "city", "prixMax", "page"].includes(key),
  );
  const searchHidden = Object.fromEntries(
    rawParams.filter(([key]) => !["q", "page"].includes(key)),
  );

  return (
    <main className="min-h-screen bg-soleil-cream text-soleil-forest animate-in fade-in duration-300 dark:bg-soleil-night dark:text-soleil-cream">
      <h1 className="sr-only">{t.listings.title}</h1>
      <div className="mx-auto w-full max-w-md px-5 pb-12 lg:max-w-6xl lg:px-8">
        {/* Header wordmark + pilule ville (même squelette que l'écran 1). */}
        <div className="flex items-end justify-between pt-4 lg:hidden">
          <Link href="/" className="flex items-end gap-2" aria-label={t.nav.home}>
            <Sun w={20} />
            <span className="font-display text-[23px] font-extrabold leading-[0.9] tracking-[-0.5px]">
              péyi
            </span>
          </Link>
          <span className="rounded-full border-[1.5px] border-soleil-forest px-3 py-1.5 text-xs font-bold dark:border-soleil-cream">
            {cityName ?? "Guyane"}
          </span>
        </div>

        <TabsPeyi active="annonces" className="pt-3" />

        <SearchField
          placeholder={t.listings.searchPlaceholder}
          action="/annonces"
          defaultValue={q ?? ""}
          hidden={searchHidden}
          className="mt-3.5"
        />

        <form action="/annonces" method="get" className="pt-3">
          {chipsHidden.map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <div className="scrollbar-hide -mx-5 flex gap-2 overflow-x-auto px-5">
            <FilterSelect
              name="sort"
              options={[
                { value: "new", label: t.listings.sortRecent },
                { value: "price-asc", label: t.listings.sortPriceAsc },
                { value: "price-desc", label: t.listings.sortPriceDesc },
              ]}
              defaultValue={sort}
              alwaysActive
            />
            <FilterSelect
              name="category"
              placeholder={t.common.category}
              options={categories.map((c) => ({ value: c.slug, label: c.name }))}
              defaultValue={category ?? ""}
            />
            <FilterSelect
              name="prixMax"
              placeholder={t.common.price}
              options={[
                { value: "50", label: "− 50 €" },
                { value: "200", label: "− 200 €" },
                { value: "1000", label: "− 1 000 €" },
                { value: "5000", label: "− 5 000 €" },
                { value: "20000", label: "− 20 000 €" },
                // Valeur hors presets (lien profond / URL éditée) : on
                // l'affiche telle quelle pour ne pas la perdre au prochain
                // submit.
                ...(filters.priceMax != null &&
                ![50, 200, 1000, 5000, 20000].includes(filters.priceMax)
                  ? [
                      {
                        value: String(filters.priceMax),
                        label: `− ${filters.priceMax.toLocaleString("fr-FR")} €`,
                      },
                    ]
                  : []),
              ]}
              defaultValue={
                filters.priceMax != null ? String(filters.priceMax) : ""
              }
            />
            <FilterSelect
              name="city"
              placeholder={t.common.city}
              options={cities.map((c) => ({ value: c.slug, label: c.name }))}
              defaultValue={city ?? ""}
            />
          </div>
          <button type="submit" className="sr-only focus:not-sr-only focus:mt-2 focus:inline-flex focus:min-h-[36px] focus:items-center focus:rounded-full focus:border-[1.5px] focus:border-soleil-forest focus:px-3 focus:text-xs focus:font-bold dark:focus:border-soleil-cream">
            {t.common.filter}
          </button>
        </form>

        {hasDataLoadIssue && (
          <div
            role="status"
            className="mt-3 rounded-[14px] bg-soleil-sand px-3 py-2 text-xs text-soleil-body dark:bg-soleil-forest dark:text-soleil-body-d"
          >
            {t.common.loadIssue}
          </div>
        )}

        <CountLine className="pb-2 pt-3.5">
          {tFormat(t.listings.count, { n: total, place: cityName ?? "Guyane" })}
        </CountLine>

        {listings.length === 0 ? (
          <EmptyListings
            mode={hasFilters ? "filtered" : "no-listings"}
            clearFiltersHref="/annonces"
          />
        ) : (
          <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {listings.map((l) => (
              <li key={l.id}>
                <ListingCardTile
                  listing={l}
                  currentUserId={currentUser?.id ?? null}
                  isFavorited={favoriteSet.has(l.id)}
                  variant="soleil"
                />
              </li>
            ))}
          </ul>
        )}

        <ListingsPagination
          page={page}
          pageCount={pageCount}
          sort={sort}
          category={category}
          city={city}
          type={type}
          q={q}
          filters={filters}
        />

      </div>
    </main>
  );
}
