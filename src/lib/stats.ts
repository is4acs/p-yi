import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/prisma";

/**
 * Agrégats globaux cachés — KPIs des heroes, compteurs par catégorie,
 * top communes.
 *
 * Pourquoi ce module : les pages les plus visitées (`/`, `/bons-plans`,
 * `/annonces`) sont en `force-dynamic` (auth dans le header, votes,
 * favoris) et chacune déclenche 2 à 6 requêtes d'agrégation Prisma
 * (`count`, `groupBy`) qui ne dépendent PAS de l'utilisateur. Sans
 * cache, chaque page vue paie ces requêtes — c'est le premier poste
 * de charge DB de l'app alors que le résultat est identique pour tout
 * le monde et change lentement.
 *
 * Stratégie : `unstable_cache` avec revalidation temporelle de 5 min.
 * Un KPI "membres actifs" ou un compteur de catégorie vieux de 5 min
 * est indiscernable pour l'utilisateur, et la charge DB de ces
 * agrégats devient O(1 requête / 5 min) au lieu de O(1 / page vue).
 *
 * Règles à respecter dans ce fichier :
 *   - Les `new Date()` sont calculées À L'INTÉRIEUR des fonctions
 *     cachées. Passées en argument, elles changeraient la clé de
 *     cache à chaque requête et rendraient le cache inopérant.
 *   - Les retours doivent être JSON-sérialisables (nombres, strings,
 *     objets simples) : `unstable_cache` sérialise le résultat. Pas
 *     de `Date` ni de `Prisma.Decimal` en sortie.
 *   - Aucune lecture de `cookies()`/`headers()` ici — interdit dans
 *     une fonction cachée, et de toute façon ces données sont
 *     globales par construction.
 *
 * Les composants appelants gardent leur `withTimeout` + try/catch :
 * en cas de DB down, l'erreur se propage (elle n'est pas mise en
 * cache) et le fallback UI existant prend le relais.
 *
 * Les tags permettent une invalidation ciblée future via
 * `revalidateTag("stats:deals")` dans les server actions si un jour
 * on veut des compteurs temps-réel. Pour l'instant la revalidation
 * temporelle suffit.
 */

const STATS_REVALIDATE_S = 300;

// ---------------------------------------------------------------------------
// KPIs des heroes
// ---------------------------------------------------------------------------

/** KPIs du hero de la home : vitalité globale du marketplace. */
export const fetchHomeHeroKpis = unstable_cache(
  async () => {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [dealsThisMonth, listingsThisWeek, activeMembers] =
      await Promise.all([
        prisma.deal.count({
          where: { status: "PUBLISHED", publishedAt: { gte: firstOfMonth } },
        }),
        prisma.listing.count({
          where: { status: "PUBLISHED", publishedAt: { gte: sevenDaysAgo } },
        }),
        prisma.user.count({
          where: { lastActiveAt: { gte: thirtyDaysAgo } },
        }),
      ]);

    return { dealsThisMonth, listingsThisWeek, activeMembers };
  },
  ["home-hero-kpis"],
  { revalidate: STATS_REVALIDATE_S, tags: ["stats:deals", "stats:listings"] },
);

/** KPIs du hero `/bons-plans` : dynamique du catalogue deals. */
export const fetchDealsHeroKpis = unstable_cache(
  async () => {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [dealsThisMonth, hotThisWeek, activeMembers] = await Promise.all([
      prisma.deal.count({
        where: { status: "PUBLISHED", publishedAt: { gte: firstOfMonth } },
      }),
      prisma.deal.count({
        where: {
          status: "PUBLISHED",
          temperature: { gte: 100 },
          publishedAt: { gte: sevenDaysAgo },
        },
      }),
      prisma.user.count({
        where: { lastActiveAt: { gte: thirtyDaysAgo } },
      }),
    ]);

    return { dealsThisMonth, hotThisWeek, activeMembers };
  },
  ["deals-hero-kpis"],
  { revalidate: STATS_REVALIDATE_S, tags: ["stats:deals"] },
);

/** KPIs du hero `/annonces` (le total vient de la page, déjà compté). */
export const fetchListingsHeroKpis = unstable_cache(
  async () => {
    const now = Date.now();
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const [freshThisWeek, activeMembers] = await Promise.all([
      prisma.listing.count({
        where: { status: "PUBLISHED", publishedAt: { gte: sevenDaysAgo } },
      }),
      prisma.user.count({
        where: { lastActiveAt: { gte: thirtyDaysAgo } },
      }),
    ]);

    return { freshThisWeek, activeMembers };
  },
  ["listings-hero-kpis"],
  { revalidate: STATS_REVALIDATE_S, tags: ["stats:listings"] },
);

// ---------------------------------------------------------------------------
// Catégories + compteurs
// ---------------------------------------------------------------------------

type CategoryRow = {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  sortOrder: number;
};

type CategoriesWithCounts = {
  categories: CategoryRow[];
  /** dealId/listingId actifs par catégorie — aplati depuis le groupBy
   *  Prisma (`_count._all`) pour rester JSON-sérialisable simple. */
  counts: Array<{ categoryId: string; count: number }>;
};

/** Catégories DEAL|BOTH + compteur de deals actifs (DealCategoryStrip). */
export const fetchDealCategoriesWithCounts = unstable_cache(
  async (): Promise<CategoriesWithCounts> => {
    const [categories, grouped] = await Promise.all([
      prisma.category.findMany({
        where: { type: { in: ["DEAL", "BOTH"] }, isActive: true },
        select: { id: true, slug: true, name: true, icon: true, sortOrder: true },
      }),
      prisma.deal.groupBy({
        by: ["categoryId"],
        where: {
          status: "PUBLISHED",
          // Deal expiré = plus "un plan actif" → exclu du compteur.
          // `expiresAt: null` (event-like sans date fin) reste compté.
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        _count: { _all: true },
      }),
    ]);

    return {
      categories,
      counts: grouped.map((g) => ({
        categoryId: g.categoryId,
        count: g._count._all,
      })),
    };
  },
  ["deal-categories-counts"],
  { revalidate: STATS_REVALIDATE_S, tags: ["stats:deals"] },
);

/** Catégories LISTING|BOTH + compteur d'annonces actives (HomeCategoriesGrid). */
export const fetchListingCategoriesWithCounts = unstable_cache(
  async (): Promise<CategoriesWithCounts> => {
    const [categories, grouped] = await Promise.all([
      prisma.category.findMany({
        where: { type: { in: ["LISTING", "BOTH"] }, isActive: true },
        select: { id: true, slug: true, name: true, icon: true, sortOrder: true },
      }),
      prisma.listing.groupBy({
        by: ["categoryId"],
        where: { status: "PUBLISHED", expiresAt: { gt: new Date() } },
        _count: { _all: true },
      }),
    ]);

    return {
      categories,
      counts: grouped.map((g) => ({
        categoryId: g.categoryId,
        count: g._count._all,
      })),
    };
  },
  ["listing-categories-counts"],
  { revalidate: STATS_REVALIDATE_S, tags: ["stats:listings"] },
);

// ---------------------------------------------------------------------------
// Top communes
// ---------------------------------------------------------------------------

/** Top 6 communes par volume d'annonces actives (HomeCommunesSection). */
export const fetchTopCommunes = unstable_cache(
  async (): Promise<
    Array<{ city: { id: string; slug: string; name: string }; count: number }>
  > => {
    const counts = await prisma.listing.groupBy({
      by: ["cityId"],
      where: { status: "PUBLISHED", expiresAt: { gt: new Date() } },
      _count: { _all: true },
      orderBy: { _count: { cityId: "desc" } },
      take: 6,
    });
    if (counts.length === 0) return [];

    const cities = await prisma.city.findMany({
      where: { id: { in: counts.map((c) => c.cityId) } },
      select: { id: true, slug: true, name: true },
    });
    const cityById = new Map(cities.map((c) => [c.id, c]));

    // On préserve l'ordre de `counts` (desc par volume) en le mappant.
    return counts
      .map((c) => ({ city: cityById.get(c.cityId), count: c._count._all }))
      .filter(
        (r): r is { city: { id: string; slug: string; name: string }; count: number } =>
          Boolean(r.city),
      );
  },
  ["top-communes"],
  { revalidate: STATS_REVALIDATE_S, tags: ["stats:listings"] },
);
