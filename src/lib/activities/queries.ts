import "server-only";

import { ActivityStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/**
 * Requêtes serveur de la verticale activités. Comme `lib/deals/queries` et
 * `lib/listings/queries` : uniquement de la lecture Prisma, les timeouts
 * fail-fast (`withTimeout`) restent à la charge des appelants (routes API,
 * pages) pour choisir leur budget.
 */

/** Sélection minimale pour la carte — jamais de description ni d'images
 *  complètes dans ce payload (réseau mobile faible hors littoral).
 *  Exportée pour les pages piliers SEO (même shape → mêmes cards). */
export const activityMapSelect = {
  id: true,
  slug: true,
  name: true,
  category: true,
  latitude: true,
  longitude: true,
  priceMinCents: true,
  isFree: true,
  accessModes: true,
  seasons: true,
  difficulty: true,
  durationMinutes: true,
  city: { select: { slug: true, name: true } },
  images: {
    select: { url: true },
    orderBy: { sortOrder: Prisma.SortOrder.asc },
    take: 1,
  },
} satisfies Prisma.ActivitySelect;

export type ActivityMapRow = Prisma.ActivityGetPayload<{
  select: typeof activityMapSelect;
}>;

export function getPublishedActivitiesForMap() {
  return prisma.activity.findMany({
    where: { status: ActivityStatus.PUBLISHED },
    select: activityMapSelect,
    orderBy: { createdAt: Prisma.SortOrder.asc },
  });
}

const DETAIL_INCLUDE = {
  city: { select: { slug: true, name: true } },
  images: { orderBy: { sortOrder: Prisma.SortOrder.asc } },
  operator: {
    select: {
      id: true,
      name: true,
      slug: true,
      phone: true,
      website: true,
      isVerified: true,
    },
  },
} satisfies Prisma.ActivityInclude;

export type ActivityDetailRow = Prisma.ActivityGetPayload<{
  include: typeof DETAIL_INCLUDE;
}>;

export function getPublishedActivityBySlug(slug: string) {
  return prisma.activity.findFirst({
    where: { slug, status: ActivityStatus.PUBLISHED },
    include: DETAIL_INCLUDE,
  });
}

/** Liens fiche (nom + commune) pour le <noscript> SEO de la page carte. */
export function getPublishedActivityLinks() {
  return prisma.activity.findMany({
    where: { status: ActivityStatus.PUBLISHED },
    select: { slug: true, name: true, city: { select: { name: true } } },
    orderBy: { name: Prisma.SortOrder.asc },
  });
}

export function getPublishedActivitySlugs() {
  return prisma.activity.findMany({
    where: { status: ActivityStatus.PUBLISHED },
    select: { slug: true, updatedAt: true },
    orderBy: { createdAt: Prisma.SortOrder.asc },
  });
}

/** Incrément de compteur de vues, fire-and-forget (jamais bloquant). */
export function bumpActivityViewCount(id: string): void {
  prisma.activity
    .update({ where: { id }, data: { viewCount: { increment: 1 } } })
    .catch(() => {
      // Best-effort : un compteur de vues ne justifie jamais une erreur.
    });
}
