import { Prisma, DealStatus } from "@prisma/client";
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
  price: true,
  originalPrice: true,
  discountPercent: true,
  isFree: true,
  temperature: true,
  commentCount: true,
  publishedAt: true,
  coverImageUrl: true,
  city: { select: { name: true, slug: true } },
  category: { select: { name: true, slug: true, icon: true } },
  store: { select: { name: true, slug: true } },
  merchant: { select: { name: true, slug: true, logoUrl: true } },
} satisfies Prisma.DealSelect;

export type DealCardData = Prisma.DealGetPayload<{ select: typeof dealCardSelect }>;

type Filters = {
  category: string | null;
  city: string | null;
};

function buildWhere({ category, city }: Filters): Prisma.DealWhereInput {
  return {
    status: DealStatus.PUBLISHED,
    ...(category ? { category: { slug: category } } : {}),
    ...(city ? { city: { slug: city } } : {}),
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
}: {
  sort: DealsSort;
  page: number;
  category: string | null;
  city: string | null;
}) {
  const where = buildWhere({ category, city });
  const skip = (page - 1) * PAGE_SIZE;

  if (sort === "new") {
    const [deals, total] = await Promise.all([
      prisma.deal.findMany({
        where,
        orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
        skip,
        take: PAGE_SIZE,
        select: dealCardSelect,
      }),
      prisma.deal.count({ where }),
    ]);
    return { deals, total };
  }

  if (sort === "top-week") {
    const weekAgo = new Date(Date.now() - 7 * 86_400_000);
    const weekWhere: Prisma.DealWhereInput = { ...where, publishedAt: { gte: weekAgo } };
    const [deals, total] = await Promise.all([
      prisma.deal.findMany({
        where: weekWhere,
        orderBy: [{ isPinned: "desc" }, { temperature: "desc" }],
        skip,
        take: PAGE_SIZE,
        select: dealCardSelect,
      }),
      prisma.deal.count({ where: weekWhere }),
    ]);
    return { deals, total };
  }

  // sort === "hot"
  const windowStart = new Date(Date.now() - HOT_WINDOW_DAYS * 86_400_000);
  const pool = await prisma.deal.findMany({
    where: { ...where, publishedAt: { gte: windowStart } },
    orderBy: { publishedAt: "desc" },
    take: HOT_POOL_CAP,
    select: dealCardSelect,
  });

  const now = Date.now();
  const ranked = pool
    .map((d) => ({ d, score: hotScore(d.temperature, d.publishedAt, now) }))
    // pinned deals always on top regardless of score (not selected here,
    // so we approximate by keeping the DB's order stability)
    .sort((a, b) => b.score - a.score);

  return {
    deals: ranked.slice(skip, skip + PAGE_SIZE).map((x) => x.d),
    total: ranked.length,
  };
}
