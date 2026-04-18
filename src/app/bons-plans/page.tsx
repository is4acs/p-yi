import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import {
  fetchDealsPage,
  fetchUserFavoriteSet,
  fetchUserVoteMap,
  PAGE_SIZE,
} from "@/lib/deals/queries";
import { parsePage, parseQuery, parseSort } from "@/lib/deals/url";
import { getCurrentUser } from "@/lib/auth/current-user";
import { buildCanonicalPath } from "@/lib/seo/canonical";
import { DealCard } from "@/components/deals/DealCard";
import { DealsSortTabs } from "@/components/deals/DealsSortTabs";
import { DealsFilterBar } from "@/components/deals/DealsFilterBar";
import { DealsPagination } from "@/components/deals/DealsPagination";
import { DealsSearchBar } from "@/components/deals/DealsSearchBar";
import { EmptyDeals } from "@/components/deals/EmptyDeals";

export const dynamic = "force-dynamic";

type SearchParams = {
  sort?: string;
  category?: string;
  city?: string;
  page?: string;
  q?: string;
};

/**
 * Resout les slugs `category` / `city` en noms humains pour enrichir
 * le titre et la description. On fait UNE seule requête (les deux
 * slugs sont uniques). Si un slug n'existe pas en DB, on retombe
 * sur le slug tel quel (évite de perdre la requête SEO si la DB et
 * l'URL divergent temporairement).
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

  // Canonical : on garde les facettes permanentes (category + city)
  // mais on ignore sort, page, q — ces querystrings sont des "vues"
  // qui canonicalisent toutes vers la même URL de base. Les
  // recherches (q) ne sont pas indexées : noindex ci-dessous.
  const canonical = buildCanonicalPath("/bons-plans", {
    category: categorySlug,
    city: citySlug,
  });

  if (q) {
    return {
      title: `Recherche « ${q} »`,
      description: `Bons plans en Guyane correspondant à « ${q} ».`,
      alternates: { canonical: "/bons-plans" },
      // Les pages de recherche interne gaspillent le crawl budget
      // et ne convertissent pas en organique — on les exclut.
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
    const title = `Bons plans ${label}`;
    const description = `Les bons plans ${label.toLowerCase()} partagés par la communauté en Guyane sur Péyi.`;
    return {
      title,
      description,
      alternates: { canonical },
      openGraph: { title, description, url: canonical },
      twitter: { title, description, card: "summary_large_image" },
    };
  }

  const title = "Bons plans de Guyane";
  const description =
    "Les bons plans partagés par la communauté en Guyane. Partage, vote et profite des meilleures promos.";
  return {
    title,
    description,
    alternates: { canonical: "/bons-plans" },
    openGraph: { title, description, url: "/bons-plans" },
    twitter: { title, description, card: "summary_large_image" },
  };
}

export default async function BonsPlansPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sort = parseSort(searchParams.sort);
  const page = parsePage(searchParams.page);
  const category = searchParams.category?.trim() || null;
  const city = searchParams.city?.trim() || null;
  const q = parseQuery(searchParams.q);

  const [{ deals, total }, categories, cities, currentUser] = await Promise.all([
    fetchDealsPage({ sort, page, category, city, q }),
    prisma.category.findMany({
      where: { type: "DEAL", isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { slug: true, name: true, icon: true },
    }),
    prisma.city.findMany({
      orderBy: { name: "asc" },
      select: { slug: true, name: true },
    }),
    getCurrentUser(),
  ]);

  const dealIds = deals.map((d) => d.id);
  const [voteMap, favoriteSet] = await Promise.all([
    fetchUserVoteMap(currentUser?.id ?? null, dealIds),
    fetchUserFavoriteSet(currentUser?.id ?? null, dealIds),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = Boolean(category || city || q);

  return (
    <main className="mx-auto max-w-md pb-12 animate-in fade-in duration-300 sm:max-w-2xl">
      <div className="sticky top-0 z-10 -mx-0 border-b border-border bg-background/95 px-4 pb-3 pt-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-0 sm:pt-6">
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Bons plans
        </h1>
        <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
          {total} bon{total > 1 ? "s" : ""} plan{total > 1 ? "s" : ""}
          {q ? (
            <>
              {" "}pour <span className="font-medium text-foreground">“{q}”</span>
            </>
          ) : hasFilters ? (
            " (filtré)"
          ) : null}
        </p>

        <div className="mt-3 space-y-2">
          <DealsSearchBar
            defaultValue={q ?? ""}
            sort={sort}
            category={category}
            city={city}
          />
          <DealsSortTabs
            currentSort={sort}
            category={category}
            city={city}
            q={q}
          />
          <DealsFilterBar
            sort={sort}
            categories={categories}
            cities={cities}
            selectedCategory={category}
            selectedCity={city}
            q={q}
          />
        </div>
      </div>

      <div className="px-4 pt-4 sm:px-0">
        {deals.length === 0 ? (
          <EmptyDeals hasFilters={hasFilters} />
        ) : (
          <ul className="flex flex-col gap-3">
            {deals.map((d) => (
              <li key={d.id}>
                <DealCard
                  deal={d}
                  currentUserId={currentUser?.id ?? null}
                  myVote={voteMap.get(d.id) ?? null}
                  isFavorited={favoriteSet.has(d.id)}
                />
              </li>
            ))}
          </ul>
        )}

        <DealsPagination
          page={page}
          pageCount={pageCount}
          sort={sort}
          category={category}
          city={city}
          q={q}
        />
      </div>
    </main>
  );
}
