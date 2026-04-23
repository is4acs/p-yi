import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { dealCardSelect } from "@/lib/deals/queries";
import { listingCardSelect } from "@/lib/listings/queries";

type DealPillarFilters = {
  citySlug?: string | null;
  categorySlug?: string | null;
  storeSlug?: string | null;
  take?: number;
};

type ListingPillarFilters = {
  citySlug?: string | null;
  categorySlug?: string | null;
  take?: number;
};

function buildDealsPillarWhere(filters: DealPillarFilters): Prisma.DealWhereInput {
  return {
    status: "PUBLISHED",
    OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    ...(filters.citySlug ? { city: { slug: filters.citySlug } } : {}),
    ...(filters.categorySlug ? { category: { slug: filters.categorySlug } } : {}),
    ...(filters.storeSlug ? { store: { slug: filters.storeSlug } } : {}),
  };
}

function buildListingsPillarWhere(
  filters: ListingPillarFilters,
): Prisma.ListingWhereInput {
  return {
    status: "PUBLISHED",
    expiresAt: { gt: new Date() },
    ...(filters.citySlug ? { city: { slug: filters.citySlug } } : {}),
    ...(filters.categorySlug ? { category: { slug: filters.categorySlug } } : {}),
  };
}

export async function countDealsForPillar(filters: DealPillarFilters) {
  return prisma.deal.count({ where: buildDealsPillarWhere(filters) });
}

export async function countListingsForPillar(filters: ListingPillarFilters) {
  return prisma.listing.count({ where: buildListingsPillarWhere(filters) });
}

export async function fetchDealsForPillar(filters: DealPillarFilters) {
  const where = buildDealsPillarWhere(filters);

  const take = filters.take ?? 18;

  const [deals, total] = await Promise.all([
    prisma.deal.findMany({
      where,
      orderBy: [
        { isPinned: "desc" },
        { temperature: "desc" },
        { publishedAt: "desc" },
      ],
      take,
      select: dealCardSelect,
    }),
    prisma.deal.count({ where }),
  ]);

  return { deals, total };
}

export async function fetchListingsForPillar(filters: ListingPillarFilters) {
  const where = buildListingsPillarWhere(filters);

  const take = filters.take ?? 24;

  const [listings, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      orderBy: [
        { isBoosted: "desc" },
        { isUrgent: "desc" },
        { publishedAt: "desc" },
      ],
      take,
      select: listingCardSelect,
    }),
    prisma.listing.count({ where }),
  ]);

  return { listings, total };
}

export async function fetchStoreWithDealCount(storeSlug: string) {
  return prisma.store.findUnique({
    where: { slug: storeSlug },
    select: {
      id: true,
      slug: true,
      name: true,
      address: true,
      website: true,
      city: { select: { slug: true, name: true } },
      _count: {
        select: {
          deals: {
            where: {
              status: "PUBLISHED",
              OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
            },
          },
        },
      },
    },
  });
}
