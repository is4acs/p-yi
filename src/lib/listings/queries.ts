import {
  Prisma,
  ListingStatus,
  ListingType,
  PriceType,
  ItemCondition,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

import type { ListingsSort, ListingTypeSlug } from "./url";

export const PAGE_SIZE = 20;

export const listingCardSelect = {
  id: true,
  slug: true,
  title: true,
  price: true,
  priceType: true,
  type: true,
  condition: true,
  coverImageUrl: true,
  neighborhood: true,
  publishedAt: true,
  bumpedAt: true,
  isBoosted: true,
  isUrgent: true,
  isFeatured: true,
  authorId: true,
  city: { select: { name: true, slug: true } },
  category: { select: { name: true, slug: true, icon: true } },
} satisfies Prisma.ListingSelect;

export type ListingCardData = Prisma.ListingGetPayload<{
  select: typeof listingCardSelect;
}>;

/**
 * Fetch the set of listing ids the current user has favorited among those
 * provided. Returns an empty Set if userId is null or ids is empty.
 */
export async function fetchUserFavoriteListingSet(
  userId: string | null,
  listingIds: string[],
): Promise<Set<string>> {
  if (!userId || listingIds.length === 0) return new Set();
  const favs = await prisma.favorite.findMany({
    where: { userId, listingId: { in: listingIds } },
    select: { listingId: true },
  });
  return new Set(
    favs.map((f) => f.listingId).filter((id): id is string => !!id),
  );
}

type TypeSlugMap = Record<ListingTypeSlug, ListingType>;
const TYPE_MAP: TypeSlugMap = {
  offer: ListingType.OFFER,
  demand: ListingType.DEMAND,
  exchange: ListingType.EXCHANGE,
  donation: ListingType.DONATION,
};

export function listingTypeFromSlug(slug: ListingTypeSlug): ListingType {
  return TYPE_MAP[slug];
}

type Filters = {
  category: string | null;
  city: string | null;
  type: ListingTypeSlug | null;
  q: string | null;
};

function buildWhere({ category, city, type, q }: Filters): Prisma.ListingWhereInput {
  const search = q
    ? ({
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      } satisfies Prisma.ListingWhereInput)
    : null;

  return {
    status: ListingStatus.PUBLISHED,
    expiresAt: { gt: new Date() },
    ...(category ? { category: { slug: category } } : {}),
    ...(city ? { city: { slug: city } } : {}),
    ...(type ? { type: listingTypeFromSlug(type) } : {}),
    ...(search ?? {}),
  };
}

export async function fetchListingsPage({
  sort,
  page,
  category,
  city,
  type,
  q,
}: {
  sort: ListingsSort;
  page: number;
  category: string | null;
  city: string | null;
  type: ListingTypeSlug | null;
  q: string | null;
}) {
  const where = buildWhere({ category, city, type, q });
  const skip = (page - 1) * PAGE_SIZE;

  // Boosted / urgent listings always on top; then the chosen sort.
  const orderBy: Prisma.ListingOrderByWithRelationInput[] =
    sort === "price-asc"
      ? [{ isBoosted: "desc" }, { price: "asc" }]
      : sort === "price-desc"
      ? [{ isBoosted: "desc" }, { price: "desc" }]
      : [
          { isBoosted: "desc" },
          { isUrgent: "desc" },
          { publishedAt: "desc" },
        ];

  const [listings, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      orderBy,
      skip,
      take: PAGE_SIZE,
      select: listingCardSelect,
    }),
    prisma.listing.count({ where }),
  ]);

  return { listings, total };
}

export function formatPriceType(
  priceType: PriceType,
  price: Prisma.Decimal | null,
): string {
  const amount = price ? Number(price.toString()) : null;
  const fmt = (n: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(n);

  switch (priceType) {
    case "FREE":
      return "Gratuit";
    case "ON_REQUEST":
      return "Sur demande";
    case "PER_MONTH":
      return amount !== null ? `${fmt(amount)} / mois` : "Prix mensuel";
    case "PER_DAY":
      return amount !== null ? `${fmt(amount)} / jour` : "Prix par jour";
    case "NEGOTIABLE":
      return amount !== null ? `${fmt(amount)} à débattre` : "À débattre";
    case "FIXED":
    default:
      return amount !== null ? fmt(amount) : "—";
  }
}

export const CONDITION_LABEL: Record<ItemCondition, string> = {
  NEW: "Neuf",
  LIKE_NEW: "Comme neuf",
  VERY_GOOD: "Très bon état",
  GOOD: "Bon état",
  ACCEPTABLE: "État correct",
  FOR_PARTS: "Pour pièces",
};

export const TYPE_LABEL: Record<ListingType, string> = {
  OFFER: "Propose",
  DEMAND: "Recherche",
  EXCHANGE: "Échange",
  DONATION: "Don",
};
