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
import { BonsPlansHero } from "@/components/deals/BonsPlansHero";
import { DealCard } from "@/components/deals/DealCard";
import { DealCategoryStrip } from "@/components/deals/DealCategoryStrip";
import { DealsSortTabs } from "@/components/deals/DealsSortTabs";
import { DealsFilterBar } from "@/components/deals/DealsFilterBar";
import { DealsPagination } from "@/components/deals/DealsPagination";
import { DealsSearchBar } from "@/components/deals/DealsSearchBar";
import { EmptyDeals } from "@/components/deals/EmptyDeals";
import { OnboardingNudge } from "@/components/onboarding/OnboardingNudge";
import { ExplorerAlso } from "@/components/seo/SeoBlocks";
import { getDealsFacetCanonicalPath } from "@/lib/seo/local-pages";
import { buildDealsGlobalExploreLinks } from "@/lib/seo/pillar-content";

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

export async function generateMetadata(
  props: {
    searchParams: Promise<SearchParams>;
  }
): Promise<Metadata> {
  const searchParams = await props.searchParams;
  const q = parseQuery(searchParams.q);
  const sort = parseSort(searchParams.sort);
  const page = parsePage(searchParams.page);
  const categorySlug = searchParams.category?.trim() || null;
  const citySlug = searchParams.city?.trim() || null;

  // Toutes les vues filtrées/recherchées (query params) passent en
  // noindex pour éviter la bloat SEO. Les pages piliers dédiées
  // (/bons-plans/guyane, /bons-plans/{ville}, /bons-plans/{cat}/guyane)
  // portent l'indexation locale.
  const hasFacet = Boolean(categorySlug || citySlug);
  const hasQueryVariant = Boolean(q) || sort !== "hot" || page > 1;
  const isFilteredView = hasFacet || hasQueryVariant;
  const facetCanonical =
    getDealsFacetCanonicalPath({ categorySlug, citySlug }) ?? "/bons-plans";

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
      alternates: { canonical: facetCanonical },
      robots: { index: !isFilteredView, follow: true },
      openGraph: { title, description, url: facetCanonical },
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
    robots: { index: true, follow: true },
    openGraph: { title, description, url: "/bons-plans" },
    twitter: { title, description, card: "summary_large_image" },
  };
}

export default async function BonsPlansPage(
  props: {
    searchParams: Promise<SearchParams>;
  }
) {
  const searchParams = await props.searchParams;
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

  // Onboarding steps (user connecté uniquement, page non filtrée).
  // Chaque étape est pilotée par un champ que l'utilisateur peut
  // remplir lui-même — pas de logique serveur cachée. Les liens
  // pointent vers la page exacte où compléter.
  let onboardingSteps: Array<{
    key: string;
    label: string;
    href: string;
    done: boolean;
  }> = [];
  if (currentUser && !hasFilters) {
    const [publishedDealCount, publishedListingCount] = await Promise.all([
      prisma.deal.count({
        where: { authorId: currentUser.id, status: "PUBLISHED" },
      }),
      prisma.listing.count({
        where: { authorId: currentUser.id, status: "PUBLISHED" },
      }),
    ]);
    onboardingSteps = [
      {
        key: "avatar",
        label: "Ajoute une photo de profil",
        href: "/profil/edit",
        done: Boolean(currentUser.avatarUrl),
      },
      {
        key: "city",
        label: "Renseigne ta commune",
        href: "/profil/edit",
        done: Boolean(currentUser.cityId),
      },
      {
        key: "first-post",
        label: "Publie ton premier contenu (bon plan ou annonce)",
        href: "/poster",
        done: publishedDealCount + publishedListingCount > 0,
      },
    ];
  }

  return (
    <main className="mx-auto max-w-md pb-12 animate-in fade-in duration-300 sm:max-w-2xl">
      {/* Hero éditorial : mode découverte uniquement (sous filtre, on
          laisse la vedette aux résultats). */}
      {!hasFilters && <BonsPlansHero />}

      {/* Onboarding nudge : profil incomplet / aucun post. Dismiss
          persistant en localStorage. Server-computed steps → pas de
          flash d'étapes fausses. */}
      {onboardingSteps.length > 0 && (
        <OnboardingNudge steps={onboardingSteps} />
      )}

      {/* Strip catégories : TOUJOURS visible (refonte S34). Avant, elle
          était masquée sous filtre comme le hero, ce qui donnait une
          impression de "redirect" sèche quand l'utilisateur cliquait
          une catégorie (perte du rail de navigation). Maintenant la
          pill active est mise en avant en orange brand, et l'utilisateur
          peut sauter d'une catégorie à l'autre sans passer par le
          select dropdown. */}
      <DealCategoryStrip selectedCategory={category} />

      {/* Sticky ancré SOUS le Header global (`sticky top-0 z-30 h-14
          sm:h-16`) et non à `top-0` comme avant S33 — sinon les deux
          se chevauchent au même offset. `z-20` passe au-dessus des
          `z-10` internes aux `DealCard` (vote-rail + FavoriteButton),
          ce qui évite le bug S32 où le rail flottait par-dessus la
          barre de recherche en scroll. */}
      <div className="sticky top-14 z-20 -mx-0 border-b border-border bg-background/95 px-4 pb-3 pt-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:top-16 sm:px-0 sm:pt-6">
        {/* H1 + count : on les conserve UNIQUEMENT en mode filtré.
            Quand le hero est affiché il porte déjà le H1 — doubler le
            titre casserait la hiérarchie a11y (deux H1 = pas d'ancrage
            d'outline clair pour les lecteurs d'écran). En mode filtré
            le hero disparaît, donc le titre reprend sa place ici. */}
        {hasFilters && (
          <>
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Bons plans
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
              {total} bon{total > 1 ? "s" : ""} plan{total > 1 ? "s" : ""}
              {q ? (
                <>
                  {" "}pour <span className="font-medium text-foreground">“{q}”</span>
                </>
              ) : (
                " (filtré)"
              )}
            </p>
          </>
        )}

        <div className={hasFilters ? "mt-3 space-y-2" : "space-y-2"}>
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

        {!hasFilters && (
          <div className="mt-6">
            <ExplorerAlso links={buildDealsGlobalExploreLinks()} />
          </div>
        )}
      </div>
    </main>
  );
}
