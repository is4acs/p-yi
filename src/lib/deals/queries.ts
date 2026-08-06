import { Prisma, DealStatus, type VoteType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { DealsSort } from "@/lib/deals/url";

export const PAGE_SIZE = 20;

// Size of the candidate pool fetched for the "hot" ranking. The pool is
// scored in JS. Safe cap until we move the score into a materialized
// column refreshed by a cron job.
const HOT_POOL_CAP = 500;
const HOT_WINDOW_DAYS = 60;

export const dealCardSelect = {
  id: true,
  slug: true,
  title: true,
  // `description` pour l'aperçu en mode `full` (desktop). Sur la liste
  // on tronque à 2 lignes via `line-clamp-2` — payload raisonnable.
  description: true,
  price: true,
  originalPrice: true,
  discountPercent: true,
  isFree: true,
  temperature: true,
  upvotes: true,
  downvotes: true,
  commentCount: true,
  // `viewCount` pour le compteur d'œil (meta row desktop). Alimenté par
  // le trigger de détail (non inclus dans ce commit).
  viewCount: true,
  publishedAt: true,
  // `expiresAt` pour l'alerte "Expire dans X j" en bas de carte. On
  // n'affiche l'alerte que dans la fenêtre ≤ 3 jours — cf. DealCard.
  expiresAt: true,
  coverImageUrl: true,
  authorId: true,
  // `author` pour le "posted-by" dans le pied de carte desktop (avatar
  // gradient + pseudo + ville). `city` optionnel — certains comptes
  // n'ont pas rempli leur ville, on masque le `·` dans ce cas.
  author: {
    select: {
      username: true,
      city: { select: { name: true } },
    },
  },
  city: { select: { name: true, slug: true } },
  category: { select: { name: true, slug: true, icon: true } },
  store: { select: { name: true, slug: true, logoUrl: true } },
  merchant: { select: { name: true, slug: true, logoUrl: true } },
} satisfies Prisma.DealSelect;

export type DealCardData = Prisma.DealGetPayload<{ select: typeof dealCardSelect }>;

/**
 * Fetch a map of dealId -> current user's vote for the given deals.
 * Returns an empty map if userId is null or dealIds is empty.
 */
export async function fetchUserVoteMap(
  userId: string | null,
  dealIds: string[],
): Promise<Map<string, VoteType>> {
  if (!userId || dealIds.length === 0) return new Map();
  const votes = await prisma.vote.findMany({
    where: { userId, dealId: { in: dealIds } },
    select: { dealId: true, value: true },
  });
  return new Map(votes.map((v) => [v.dealId, v.value]));
}

/**
 * Fetch the set of dealIds the current user has favorited among those
 * provided. Returns an empty Set if userId is null or dealIds is empty.
 */
export async function fetchUserFavoriteSet(
  userId: string | null,
  dealIds: string[],
): Promise<Set<string>> {
  if (!userId || dealIds.length === 0) return new Set();
  const favs = await prisma.favorite.findMany({
    where: { userId, dealId: { in: dealIds } },
    select: { dealId: true },
  });
  return new Set(favs.map((f) => f.dealId).filter((id): id is string => !!id));
}

type Filters = {
  category: string | null;
  city: string | null;
  q: string | null;
};

function buildWhere({ category, city, q }: Filters): Prisma.DealWhereInput {
  const search = q
    ? ({
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      } satisfies Prisma.DealWhereInput)
    : null;

  return {
    status: DealStatus.PUBLISHED,
    OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    ...(category ? { category: { slug: category } } : {}),
    ...(city ? { city: { slug: city } } : {}),
    ...(search ?? {}),
  };
}

// Reddit-like hot score: recent, high-temperature deals bubble up,
// while old high-temperature deals decay. The "+2" prevents divide-by-
// very-small for just-published deals.
function hotScore(temperature: number, publishedAt: Date, now: number): number {
  const ageHours = (now - publishedAt.getTime()) / 3_600_000;
  return temperature / Math.pow(Math.max(ageHours, 0) + 2, 1.5);
}

export async function fetchDealsPage({
  sort,
  page,
  category,
  city,
  q,
  pageSize = PAGE_SIZE,
  includeTotal = true,
}: {
  sort: DealsSort;
  page: number;
  category: string | null;
  city: string | null;
  q: string | null;
  /** Nombre de cartes par page. La home passe 6 (elle n'affiche que
   *  6 cartes) au lieu de fetch 20 puis slicer côté JS. */
  pageSize?: number;
  /** `false` pour sauter le `count()` quand l'appelant n'affiche pas
   *  de pagination (home) — `total` vaut alors le nombre de cartes
   *  retournées, pas le total réel. */
  includeTotal?: boolean;
}) {
  const where = buildWhere({ category, city, q });
  const skip = (page - 1) * pageSize;

  if (sort === "new") {
    const [deals, total] = await Promise.all([
      prisma.deal.findMany({
        where,
        orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
        skip,
        take: pageSize,
        select: dealCardSelect,
      }),
      includeTotal ? prisma.deal.count({ where }) : Promise.resolve(0),
    ]);
    return { deals, total: includeTotal ? total : deals.length };
  }

  if (sort === "top-week") {
    const weekAgo = new Date(Date.now() - 7 * 86_400_000);
    const weekWhere: Prisma.DealWhereInput = { ...where, publishedAt: { gte: weekAgo } };
    const [deals, total] = await Promise.all([
      prisma.deal.findMany({
        where: weekWhere,
        orderBy: [{ isPinned: "desc" }, { temperature: "desc" }],
        skip,
        take: pageSize,
        select: dealCardSelect,
      }),
      includeTotal ? prisma.deal.count({ where: weekWhere }) : Promise.resolve(0),
    ]);
    return { deals, total: includeTotal ? total : deals.length };
  }

  // sort === "hot" — ranking en deux phases pour ne pas payer le
  // payload complet (jointures author/city/category/store/merchant)
  // sur les 500 deals du pool à CHAQUE page vue :
  //   1. On fetch uniquement les colonnes de scoring (id, temperature,
  //      publishedAt) sur tout le pool — quelques Ko au lieu de
  //      plusieurs centaines.
  //   2. On score/trie en JS, on slice la page demandée, et on ne
  //      fetch les cartes complètes QUE pour ces ids-là.
  const windowStart = new Date(Date.now() - HOT_WINDOW_DAYS * 86_400_000);
  const pool = await prisma.deal.findMany({
    where: { ...where, publishedAt: { gte: windowStart } },
    orderBy: { publishedAt: "desc" },
    take: HOT_POOL_CAP,
    select: { id: true, temperature: true, publishedAt: true },
  });

  const now = Date.now();
  const ranked = pool
    .map((d) => ({ id: d.id, score: hotScore(d.temperature, d.publishedAt, now) }))
    // pinned deals always on top regardless of score (not selected here,
    // so we approximate by keeping the DB's order stability)
    .sort((a, b) => b.score - a.score);

  const pageIds = ranked.slice(skip, skip + pageSize).map((x) => x.id);
  if (pageIds.length === 0) {
    return { deals: [], total: ranked.length };
  }

  const pageDeals = await prisma.deal.findMany({
    where: { id: { in: pageIds } },
    select: dealCardSelect,
  });

  // `IN (…)` ne préserve pas l'ordre — on remet celui du ranking.
  const byId = new Map(pageDeals.map((d) => [d.id, d]));
  const deals = pageIds
    .map((id) => byId.get(id))
    .filter((d): d is NonNullable<typeof d> => Boolean(d));

  return { deals, total: ranked.length };
}
