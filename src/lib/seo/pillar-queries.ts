import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { activityMapSelect } from "@/lib/activities/queries";
import { getActivityCategoryBySlug } from "@/lib/activities/labels";
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
    // Les annonces vivent dans les SOUS-catégories (taxonomie Leboncoin,
    // S38) : le pilier d'une catégorie mère (vehicules, immobilier…)
    // agrège le slug lui-même OU le slug parent — même logique que
    // `buildWhere` côté catalogue, sinon les pages piliers se vident et
    // passent sous le seuil d'indexation.
    ...(filters.categorySlug
      ? {
          category: {
            OR: [
              { slug: filters.categorySlug },
              { parent: { slug: filters.categorySlug } },
            ],
          },
        }
      : {}),
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

type ActivityPillarFilters = {
  citySlug?: string | null;
  categorySlug?: string | null;
  take?: number;
};

// Contrairement aux deals/listings, la catégorie activité est un enum
// Prisma, pas une table : le slug FR de l'URL est converti via labels.ts.
// Un slug inconnu produit un filtre impossible (aucun résultat) plutôt
// qu'un crash — le notFound() est géré en amont par les pillar-utils.
function buildActivitiesPillarWhere(
  filters: ActivityPillarFilters,
): Prisma.ActivityWhereInput {
  const category = filters.categorySlug
    ? getActivityCategoryBySlug(filters.categorySlug)
    : null;
  return {
    status: "PUBLISHED",
    ...(filters.citySlug ? { city: { slug: filters.citySlug } } : {}),
    ...(filters.categorySlug ? { category: category ?? undefined } : {}),
    ...(filters.categorySlug && !category ? { id: "__aucun__" } : {}),
  };
}

export async function countActivitiesForPillar(filters: ActivityPillarFilters) {
  return prisma.activity.count({ where: buildActivitiesPillarWhere(filters) });
}

export async function fetchActivitiesForPillar(filters: ActivityPillarFilters) {
  const where = buildActivitiesPillarWhere(filters);
  const take = filters.take ?? 24;

  const [activities, total] = await Promise.all([
    prisma.activity.findMany({
      where,
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      take,
      select: activityMapSelect,
    }),
    prisma.activity.count({ where }),
  ]);

  return { activities, total };
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
