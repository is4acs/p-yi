import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";

import { prisma } from "@/lib/prisma";
import {
  fetchListingCategoryCounts,
  fetchListingsPage,
  fetchUserFavoriteListingSet,
  PAGE_SIZE,
} from "@/lib/listings/queries";
import {
  buildListingsUrl,
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
import {
  CatalogueFilters,
  CatalogueNav,
  type CatalogueCategory,
  type CatalogueState,
} from "@/components/listings/CatalogueSidebar";
import { CatalogueDrawer } from "@/components/listings/CatalogueDrawer";
import { Icon } from "@/components/ui/Icon";
import { Sun } from "@/components/soleil/Sun";
import { withTimeout } from "@/lib/async/with-timeout";
import { getLocale, getMessages, tFormat } from "@/lib/i18n";
import { translateUserTexts } from "@/lib/i18n/translate";

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

const SORT_VALUES = ["new", "price-asc", "price-desc"] as const;

export default async function AnnoncesPage(
  props: {
    searchParams: Promise<SearchParams>;
  }
) {
  const searchParams = await props.searchParams;
  const t = await getMessages();
  const locale = await getLocale();
  const sort = parseSort(searchParams.sort);
  const page = parsePage(searchParams.page);
  const type = parseType(searchParams.type);
  const category = searchParams.category?.trim() || null;
  const city = searchParams.city?.trim() || null;
  const q = parseQuery(searchParams.q);
  const filters = parseFilters(searchParams);

  const [listingsResult, categoriesResult, countsResult, currentUserResult] =
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
          select: { id: true, slug: true, name: true, parentId: true },
        }),
        PAGE_DATA_TIMEOUT_MS,
        "listings/page-categories",
      ),
      withTimeout(
        fetchListingCategoryCounts(),
        PAGE_DATA_TIMEOUT_MS,
        "listings/page-category-counts",
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

  const rawCategories =
    categoriesResult.status === "fulfilled" ? categoriesResult.value : [];
  const counts = countsResult.status === "fulfilled" ? countsResult.value : {};
  const currentUser =
    currentUserResult.status === "fulfilled" ? currentUserResult.value : null;

  const hasDataLoadIssue =
    listingsResult.status === "rejected" ||
    categoriesResult.status === "rejected" ||
    countsResult.status === "rejected" ||
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
      counts:
        countsResult.status === "rejected" ? countsResult.reason : undefined,
      currentUser:
        currentUserResult.status === "rejected"
          ? currentUserResult.reason
          : undefined,
    });
  }

  // Noms de catégories traduits vers la langue de l'interface (batch,
  // passthrough en français — cf. lib/i18n/translate.ts).
  const translatedNames = await translateUserTexts(
    rawCategories.map((c) => c.name),
    locale,
  );
  const categories: CatalogueCategory[] = rawCategories.map((c, i) => ({
    id: c.id,
    slug: c.slug,
    name: translatedNames[i]?.text ?? c.name,
    parentId: c.parentId,
  }));

  const activeCategory = category
    ? categories.find((c) => c.slug === category) ?? null
    : null;
  const activeName = activeCategory?.name ?? null;
  const headingName = activeName ?? t.listings.catalogTitle;

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

  const navState: CatalogueState = { sort, city, q, type, filters };

  // Paramètres bruts préservés par le formulaire de recherche (il ne
  // contrôle que `q` — tout le reste passe en input hidden).
  const searchHidden = Object.entries(searchParams).filter(
    (entry): entry is [string, string] =>
      typeof entry[1] === "string" &&
      entry[1] !== "" &&
      !["q", "page"].includes(entry[0]),
  );

  const sortLabels: Record<(typeof SORT_VALUES)[number], string> = {
    new: t.listings.sortRecent,
    "price-asc": t.listings.sortPriceAsc,
    "price-desc": t.listings.sortPriceDesc,
  };

  const sidebar = (
    <>
      <CatalogueNav
        categories={categories}
        counts={counts}
        category={category}
        state={navState}
        t={t}
      />
      <CatalogueFilters
        category={category}
        activeName={activeName}
        state={navState}
        t={t}
        idPrefix="d-"
      />
    </>
  );

  const drawerContent = (
    <>
      <CatalogueNav
        categories={categories}
        counts={counts}
        category={category}
        state={navState}
        t={t}
      />
      <CatalogueFilters
        category={category}
        activeName={activeName}
        state={navState}
        t={t}
        idPrefix="m-"
      />
    </>
  );

  const emptyState = (
    <div className="mt-[22px] flex flex-col items-center gap-3.5 rounded-2xl border border-dashed border-soleil-border bg-soleil-paper px-10 py-[74px] dark:border-soleil-border-d dark:bg-soleil-forest">
      <h2 className="text-center font-display text-[19px] font-extrabold">
        {tFormat(t.listings.catalogEmptyTitle, { name: headingName })}
      </h2>
      <p className="max-w-[360px] text-center text-sm text-soleil-muted dark:text-soleil-muted-d">
        {t.listings.catalogEmptySub}
      </p>
      <Link
        href="/poster/annonce"
        className="inline-flex h-[42px] items-center rounded-full bg-soleil-orange px-5 text-sm font-bold text-soleil-forest transition active:scale-95"
      >
        {t.listings.postCta}
      </Link>
    </div>
  );

  return (
    <main className="min-h-screen bg-soleil-cream text-soleil-forest animate-in fade-in duration-300 dark:bg-soleil-night dark:text-soleil-cream">
      <div className="mx-auto w-full max-w-md px-5 pb-12 lg:max-w-6xl lg:px-10">
        {/* Header wordmark mobile (le Header global prend le relais en lg). */}
        <div className="flex items-end justify-between pt-4 lg:hidden">
          <Link href="/" className="flex items-end gap-2" aria-label={t.nav.home}>
            <Sun w={20} />
            <span className="font-display text-[23px] font-extrabold leading-[0.9] tracking-[-0.5px]">
              péyi
            </span>
          </Link>
          {currentUser ? (
            <Link
              href="/profil"
              aria-label={t.home.myProfile}
              className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-soleil-forest text-[11.5px] font-extrabold text-soleil-cream dark:bg-soleil-cream dark:text-soleil-forest"
            >
              {currentUser.username.trim().slice(0, 2).toUpperCase()}
            </Link>
          ) : (
            <Link
              href="/connexion"
              aria-label={t.home.myProfile}
              className="flex h-[34px] w-[34px] items-center justify-center rounded-full border-[1.5px] border-soleil-forest dark:border-soleil-cream"
            >
              <Icon name="user" size={15} />
            </Link>
          )}
        </div>

        {/* Ligne titre : H1 (nom de la catégorie active sur mobile,
            « Annonces de Guyane » sur desktop) + CTA orange. */}
        <div className="flex items-center justify-between gap-8 pt-4 lg:pt-[34px]">
          <h1 className="font-display text-2xl font-extrabold leading-none tracking-[-0.5px] lg:text-[34px] lg:tracking-[-0.7px]">
            <span className="lg:hidden">{headingName}</span>
            <span className="hidden lg:inline">{t.listings.catalogTitle}</span>
          </h1>
          <Link
            href="/poster/annonce"
            className="hidden h-11 flex-none items-center rounded-full bg-soleil-orange px-[22px] text-sm font-bold text-soleil-forest shadow-[0_10px_24px_rgba(255,145,76,.28)] transition active:scale-95 lg:inline-flex"
          >
            {t.listings.postCta}
          </Link>
        </div>

        {/* Recherche (+ bouton Filtrer sur mobile → tiroir plein écran). */}
        <div className="mt-3.5 flex gap-2 lg:mt-[22px] lg:gap-2.5">
          <form
            action="/annonces"
            method="get"
            role="search"
            className="flex min-w-0 flex-1 gap-2 lg:gap-2.5"
          >
            {searchHidden.map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={value} />
            ))}
            <div className="flex h-[46px] min-w-0 flex-1 items-center gap-2.5 rounded-xl border-[1.5px] border-soleil-border bg-soleil-input px-4 focus-within:border-soleil-forest dark:border-soleil-border-d dark:bg-soleil-forest dark:focus-within:border-soleil-cream lg:h-[52px] lg:rounded-[14px] lg:px-5">
              <Search
                className="h-4 w-4 flex-none text-soleil-muted dark:text-soleil-muted-d"
                aria-hidden
              />
              <input
                type="search"
                name="q"
                defaultValue={q ?? ""}
                placeholder={t.listings.searchLong}
                aria-label={t.common.search}
                autoComplete="off"
                className="w-full min-w-0 bg-transparent text-[14.5px] text-soleil-forest placeholder:text-soleil-strike focus:outline-none dark:text-soleil-cream dark:placeholder:text-soleil-strike-d lg:text-[15px]"
              />
            </div>
            <button
              type="submit"
              className="hidden h-[52px] flex-none items-center rounded-[14px] bg-soleil-forest px-[26px] text-[14.5px] font-bold text-soleil-cream transition active:scale-95 dark:bg-soleil-cream dark:text-soleil-forest lg:inline-flex"
            >
              {t.listings.searchCta}
            </button>
          </form>
          <div className="lg:hidden">
            <CatalogueDrawer activeName={headingName}>
              {drawerContent}
            </CatalogueDrawer>
          </div>
        </div>

        {hasDataLoadIssue && (
          <div
            role="status"
            className="mt-3 rounded-[14px] bg-soleil-sand px-3 py-2 text-xs text-soleil-body dark:bg-soleil-forest dark:text-soleil-body-d"
          >
            {t.common.loadIssue}
          </div>
        )}

        {/* Corps : sidebar catalogue (desktop) + résultats. */}
        <div className="mt-5 flex gap-10 lg:mt-8">
          <aside className="hidden w-[236px] flex-none lg:block">
            {sidebar}
          </aside>

          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3 border-b border-soleil-line pb-3.5 dark:border-soleil-line-d">
              <span className="min-w-0 truncate font-mono text-[10px] font-bold uppercase tracking-[1.6px] text-soleil-otext dark:text-soleil-otext-d lg:text-[11px] lg:tracking-[2px]">
                {tFormat(t.listings.count, { n: total, place: headingName })}
              </span>

              {/* Tri en menu texte (détails natif — pas de pastilles). */}
              <details className="group relative flex-none">
                <summary className="cursor-pointer list-none text-[13px] text-soleil-muted2 dark:text-soleil-muted-d [&::-webkit-details-marker]:hidden">
                  {t.listings.sortLabel}{" "}
                  <b className="font-bold text-soleil-forest dark:text-soleil-cream">
                    {sortLabels[sort]}
                  </b>{" "}
                  <span aria-hidden>▾</span>
                </summary>
                <div className="absolute right-0 top-full z-20 mt-1.5 flex w-44 flex-col overflow-hidden rounded-[10px] border border-soleil-border bg-soleil-input py-1 shadow-lg dark:border-soleil-border-d dark:bg-soleil-forest">
                  {SORT_VALUES.map((value) => (
                    <Link
                      key={value}
                      href={buildListingsUrl({
                        sort: value,
                        category,
                        city,
                        q,
                        type,
                        filters,
                      })}
                      scroll={false}
                      className={
                        value === sort
                          ? "px-3.5 py-2 text-[13px] font-bold text-soleil-forest dark:text-soleil-cream"
                          : "px-3.5 py-2 text-[13px] text-soleil-body hover:bg-soleil-sand dark:text-soleil-body-d dark:hover:bg-soleil-night"
                      }
                    >
                      {sortLabels[value]}
                    </Link>
                  ))}
                </div>
              </details>
            </div>

            {listings.length === 0 ? (
              emptyState
            ) : (
              <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:mt-[22px] lg:grid-cols-3 lg:gap-[22px]">
                {listings.map((l) => (
                  <li key={l.id}>
                    <ListingCardTile
                      listing={l}
                      currentUserId={currentUser?.id ?? null}
                      isFavorited={favoriteSet.has(l.id)}
                      variant="catalogue"
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
        </div>
      </div>
    </main>
  );
}
