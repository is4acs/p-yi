import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { prisma } from "@/lib/prisma";
import {
  fetchListingsPage,
  fetchUserFavoriteListingSet,
  PAGE_SIZE,
} from "@/lib/listings/queries";
import {
  countActiveFilters,
  hasActiveFilters,
  parseFilters,
  parsePage,
  parseQuery,
  parseSort,
  parseType,
} from "@/lib/listings/url";
import { getCurrentUser } from "@/lib/auth/current-user";
import { ExplorerAlso } from "@/components/seo/SeoBlocks";
import { getListingsFacetCanonicalPath } from "@/lib/seo/local-pages";
import { buildListingsGlobalExploreLinks } from "@/lib/seo/pillar-content";
import { HomeCategoriesGrid } from "@/components/home/HomeCategoriesGrid";
import { HomeCommunesSection } from "@/components/home/HomeCommunesSection";
import { AnnoncesHero } from "@/components/listings/AnnoncesHero";
import { PopularSearchChips } from "@/components/listings/PopularSearchChips";
import { ListingCardTile } from "@/components/listings/ListingCardTile";
import { ListingsSearchBar } from "@/components/listings/ListingsSearchBar";
import { ListingsSortTabs } from "@/components/listings/ListingsSortTabs";
import { ListingsTypePills } from "@/components/listings/ListingsTypePills";
import { ListingsFilterBar } from "@/components/listings/ListingsFilterBar";
import { ListingsAttributeFilters } from "@/components/listings/ListingsAttributeFilters";
import { ListingsActiveFilterChips } from "@/components/listings/ListingsActiveFilterChips";
import { ListingsFilterDrawer } from "@/components/listings/ListingsFilterDrawer";
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
  try {
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
  const sort = parseSort(searchParams.sort);
  const page = parsePage(searchParams.page);
  const type = parseType(searchParams.type);
  const category = searchParams.category?.trim() || null;
  const city = searchParams.city?.trim() || null;
  const q = parseQuery(searchParams.q);
  const filters = parseFilters(searchParams);

  const [listingsResult, categoriesResult, citiesResult, currentUserResult] =
    await Promise.allSettled([
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
    favoriteSet = await fetchUserFavoriteListingSet(
      currentUser?.id ?? null,
      listingIds,
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[annonces/page] favorite set load failed", err);
  }

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters =
    Boolean(category || city || type || q) || hasActiveFilters(filters);
  const activeFilterCount = countActiveFilters({ category, city, type, filters });

  return (
    // Grille 2/3/4 cols → on élargit à max-w-6xl pour donner de l'air
    // au desktop (avant S27 : max-w-2xl, trop étroit pour une grille
    // photo-first).
    <main className="mx-auto max-w-md overflow-x-clip pb-12 animate-in fade-in duration-300 sm:max-w-2xl lg:max-w-6xl">
      {/* Mode découverte (aucun filtre) : hero éditorial + chips de
          recherches populaires. Sous filtre ces blocs disparaissent —
          pattern hérité de `/bons-plans` (cf. `<BonsPlansHero>` et
          `<DealCategoryStrip>`). */}
      {!hasFilters && (
        <>
          <AnnoncesHero total={total} />
          <PopularSearchChips />
        </>
      )}
      {/* Sticky ancré SOUS le Header global (`sticky top-0 z-30 h-14
          sm:h-16`) et non à `top-0` — cf. justification identique sur
          `/bons-plans/page.tsx`. `z-20` passe au-dessus des z-10
          internes aux ListingCardTile (FavoriteButton notamment). */}
      <div className="sticky top-14 z-20 -mx-0 border-b border-border bg-background/95 px-4 pb-3 pt-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:top-16 sm:px-0 sm:pt-6">
        {/* H1 + count : conservés uniquement en mode filtré. En
            découverte c'est le hero qui porte le titre ; doubler un H1
            casserait la hiérarchie a11y.

            S33 : le bouton "Poster" ne vit plus ici qu'en mode filtré.
            Avant, il flottait seul aligné à droite en mode découverte
            (quand hasFilters=false → pas de H1 à gauche → vide). Le CTA
            a été déplacé dans <AnnoncesHero> qui n'est rendu qu'en
            mode découverte. Résultat : le bouton Poster est toujours
            visible, mais à la bonne place selon le contexte. */}
        {hasFilters && (
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
                ) : (
                  " (filtré)"
                )}
              </p>
            </div>
            <Link
              href="/poster/annonce"
              className="ml-auto inline-flex h-10 shrink-0 items-center gap-1 rounded-full bg-peyi-orange-500 px-4 text-sm font-semibold text-white shadow-brand transition hover:bg-peyi-orange-600"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Poster
            </Link>
          </div>
        )}

        {/* Header simplifié S27 : une seule ligne SearchBar + bouton
            Filtrer. Tout le chrome de raffinage (type / sort / catégorie
            / commune / attributs) vit maintenant dans un drawer latéral.
            Gain de densité : ~240px de chrome en moins avant la 1re
            annonce sur mobile 375px. */}
        <div className="mt-3 flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <ListingsSearchBar
              defaultValue={q ?? ""}
              sort={sort}
              category={category}
              city={city}
              type={type}
              filters={filters}
            />
          </div>
          <ListingsFilterDrawer activeCount={activeFilterCount} totalResults={total}>
            {/* Slot du drawer : rendu côté serveur (les composants sont
                des server components avec des <Link> qui naviguent).
                L'état `open` du drawer est préservé à travers les
                re-renders RSC, l'utilisateur peut enchaîner les filtres. */}
            <section aria-labelledby="drawer-sort">
              <h3 id="drawer-sort" className="mb-2 font-display text-sm font-semibold text-ink-900">
                Trier
              </h3>
              <ListingsSortTabs
                currentSort={sort}
                category={category}
                city={city}
                type={type}
                q={q}
                filters={filters}
              />
            </section>
            <section aria-labelledby="drawer-type">
              <h3 id="drawer-type" className="mb-2 font-display text-sm font-semibold text-ink-900">
                Type d&apos;annonce
              </h3>
              <ListingsTypePills
                sort={sort}
                category={category}
                city={city}
                currentType={type}
                q={q}
                filters={filters}
              />
            </section>
            <section aria-labelledby="drawer-where">
              <h3 id="drawer-where" className="mb-2 font-display text-sm font-semibold text-ink-900">
                Catégorie &amp; commune
              </h3>
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
            </section>
            <ListingsAttributeFilters
              sort={sort}
              category={category}
              city={city}
              type={type}
              q={q}
              filters={filters}
            />
          </ListingsFilterDrawer>
        </div>

        {/* Chips des filtres actifs : on les garde EN DEHORS du drawer
            car ils servent de résumé "glanceable" — on peut retirer un
            filtre précis sans ouvrir le drawer. */}
        {hasFilters && (
          <div className="mt-3">
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
        )}
      </div>
      {/* Mode découverte : pas de filtre → on affiche les blocs
          d'exploration (catégories + communes) AVANT la liste. Donne à
          l'utilisateur des points d'entrée clairs au lieu d'un mur
          d'annonces mixtes. Quand des filtres sont actifs, on saute
          directement aux résultats (pas de bruit entre requête et
          résultat — pattern Google search). */}
      {!hasFilters && (
        <>
          <HomeCategoriesGrid />
          <HomeCommunesSection />
        </>
      )}
      <div className="mt-6 px-4 pt-4 sm:px-0">
        {hasDataLoadIssue && (
          <div
            role="status"
            className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 sm:text-sm"
          >
            Certaines données sont temporairement indisponibles. Tu peux
            recharger la page dans quelques secondes.
          </div>
        )}

        {!hasFilters && listings.length > 0 && (
          <h2 className="mb-3 font-display text-lg font-semibold text-ink-900">
            Dernières annonces
          </h2>
        )}

        {listings.length === 0 ? (
          <EmptyListings
            mode={hasFilters ? "filtered" : "no-listings"}
            clearFiltersHref="/annonces"
          />
        ) : (
          // Grille photo-first "marketplace" : 2 cols mobile, 3 cols
          // tablette, 4 cols desktop. Gap 4 (16px) pour que chaque
          // tuile respire. Hauteur naturelle variable (titre 1-2 lignes
          // selon longueur).
          (<ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {listings.map((l) => (
              <li key={l.id}>
                <ListingCardTile
                  listing={l}
                  currentUserId={currentUser?.id ?? null}
                  isFavorited={favoriteSet.has(l.id)}
                />
              </li>
            ))}
          </ul>)
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

        {!hasFilters && (
          <div className="mt-6">
            <ExplorerAlso links={buildListingsGlobalExploreLinks()} />
          </div>
        )}
      </div>
    </main>
  );
}
