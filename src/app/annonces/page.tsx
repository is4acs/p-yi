import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { buildCanonicalPath } from "@/lib/seo/canonical";
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
import { ListingCard } from "@/components/listings/ListingCard";
import { ListingsSearchBar } from "@/components/listings/ListingsSearchBar";
import { ListingsSortTabs } from "@/components/listings/ListingsSortTabs";
import { ListingsTypePills } from "@/components/listings/ListingsTypePills";
import { ListingsFilterBar } from "@/components/listings/ListingsFilterBar";
import { ListingsAttributeFilters } from "@/components/listings/ListingsAttributeFilters";
import { ListingsActiveFilterChips } from "@/components/listings/ListingsActiveFilterChips";
import { ListingsPagination } from "@/components/listings/ListingsPagination";
import { EmptyListings } from "@/components/listings/EmptyListings";

export const dynamic = "force-dynamic";

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
  const [category, city] = await Promise.all([
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
  ]);
  return {
    categoryName: category?.name ?? categorySlug ?? null,
    cityName: city?.name ?? citySlug ?? null,
  };
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const q = parseQuery(searchParams.q);
  const categorySlug = searchParams.category?.trim() || null;
  const citySlug = searchParams.city?.trim() || null;

  const canonical = buildCanonicalPath("/annonces", {
    category: categorySlug,
    city: citySlug,
  });

  if (q) {
    return {
      title: `Recherche « ${q} » · Annonces`,
      description: `Petites annonces en Guyane correspondant à « ${q} ».`,
      alternates: { canonical: "/annonces" },
      robots: { index: false, follow: true },
    };
  }

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
      alternates: { canonical },
      openGraph: { title, description, url: canonical },
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
    openGraph: { title, description, url: "/annonces" },
    twitter: { title, description, card: "summary_large_image" },
  };
}

export default async function AnnoncesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sort = parseSort(searchParams.sort);
  const page = parsePage(searchParams.page);
  const type = parseType(searchParams.type);
  const category = searchParams.category?.trim() || null;
  const city = searchParams.city?.trim() || null;
  const q = parseQuery(searchParams.q);
  const filters = parseFilters(searchParams);

  const [{ listings, total }, categories, cities, currentUser] =
    await Promise.all([
      fetchListingsPage({ sort, page, category, city, type, q, filters }),
      prisma.category.findMany({
        where: { type: { in: ["LISTING", "BOTH"] }, isActive: true },
        orderBy: { sortOrder: "asc" },
        select: { slug: true, name: true, icon: true },
      }),
      prisma.city.findMany({
        orderBy: { name: "asc" },
        select: { slug: true, name: true },
      }),
      getCurrentUser(),
    ]);

  const listingIds = listings.map((l) => l.id);
  const favoriteSet = await fetchUserFavoriteListingSet(
    currentUser?.id ?? null,
    listingIds,
  );

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters =
    Boolean(category || city || type || q) || hasActiveFilters(filters);

  return (
    <main className="mx-auto max-w-md pb-12 animate-in fade-in duration-300 sm:max-w-2xl">
      <div className="sticky top-0 z-10 -mx-0 border-b border-border bg-background/95 px-4 pb-3 pt-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-0 sm:pt-6">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Annonces
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
              {total} annonce{total > 1 ? "s" : ""}
              {q ? (
                <>
                  {" "}
                  pour{" "}
                  <span className="font-medium text-foreground">“{q}”</span>
                </>
              ) : hasFilters ? (
                " (filtré)"
              ) : null}
            </p>
          </div>
          <Link
            href="/poster/annonce"
            className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full bg-peyi-orange-500 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-peyi-orange-600"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Poster
          </Link>
        </div>

        <div className="mt-3 space-y-2">
          <ListingsSearchBar
            defaultValue={q ?? ""}
            sort={sort}
            category={category}
            city={city}
            type={type}
            filters={filters}
          />
          <ListingsTypePills
            sort={sort}
            category={category}
            city={city}
            currentType={type}
            q={q}
            filters={filters}
          />
          <ListingsSortTabs
            currentSort={sort}
            category={category}
            city={city}
            type={type}
            q={q}
            filters={filters}
          />
          <ListingsFilterBar
            sort={sort}
            categories={categories}
            cities={cities}
            selectedCategory={category}
            selectedCity={city}
            type={type}
            q={q}
            filters={filters}
          />
          <ListingsAttributeFilters
            sort={sort}
            category={category}
            city={city}
            type={type}
            q={q}
            filters={filters}
          />
          <ListingsActiveFilterChips
            sort={sort}
            category={category}
            city={city}
            type={type}
            q={q}
            filters={filters}
            categoryName={
              categories.find((c) => c.slug === category)?.name ?? null
            }
            cityName={cities.find((c) => c.slug === city)?.name ?? null}
          />
        </div>
      </div>

      <div className="px-4 pt-4 sm:px-0">
        {listings.length === 0 ? (
          <EmptyListings
            mode={hasFilters ? "filtered" : "no-listings"}
            clearFiltersHref="/annonces"
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {listings.map((l) => (
              <li key={l.id}>
                <ListingCard
                  listing={l}
                  currentUserId={currentUser?.id ?? null}
                  isFavorited={favoriteSet.has(l.id)}
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
