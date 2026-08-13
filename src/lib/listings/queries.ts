import { unstable_cache } from "next/cache";
import {
  Prisma,
  ListingStatus,
  ListingType,
  PriceType,
  ItemCondition,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { Locale } from "@/lib/i18n/config";

import type { ListingsFilters, ListingsSort, ListingTypeSlug } from "./url";

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
  attributes: true,
  city: { select: { name: true, slug: true } },
  category: { select: { name: true, slug: true, icon: true } },
  _count: { select: { images: true } },
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
  attrs?: Partial<ListingsFilters>;
};

/**
 * Transforme les filtres URL en `WhereInput` Prisma. Chaque filtre tombe
 * sur une colonne indexée (`attr*` ou `price`) pour rester sub-seconde
 * même avec 100k+ annonces.
 *
 * Les filtres `rooms` et `surfaceMin` sont interprétés comme des bornes
 * minimales (plus permissif), `kmMax` comme une borne max. Le choix
 * reflète l'usage courant sur Leboncoin : "au moins 3 pièces", "moins
 * de 100 000 km".
 */
function buildWhere({
  category,
  city,
  type,
  q,
  attrs,
}: Filters): Prisma.ListingWhereInput {
  const search = q
    ? ({
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      } satisfies Prisma.ListingWhereInput)
    : null;

  // Range price : on combine gte/lte seulement si l'un des deux est posé.
  const priceRange: Prisma.DecimalFilter | undefined =
    attrs?.priceMin != null || attrs?.priceMax != null
      ? {
          ...(attrs.priceMin != null ? { gte: attrs.priceMin } : {}),
          ...(attrs.priceMax != null ? { lte: attrs.priceMax } : {}),
        }
      : undefined;

  return {
    status: ListingStatus.PUBLISHED,
    expiresAt: { gt: new Date() },
    // Une catégorie PARENTE (vehicules, immobilier) agrège ses enfants :
    // les annonces sont rattachées aux feuilles, donc « Tout Véhicules »
    // matche le slug lui-même OU le slug du parent de la catégorie de
    // l'annonce (catalogue « calme », S38).
    ...(category
      ? {
          category: {
            OR: [{ slug: category }, { parent: { slug: category } }],
          },
        }
      : {}),
    ...(city ? { city: { slug: city } } : {}),
    ...(type ? { type: listingTypeFromSlug(type) } : {}),
    ...(priceRange ? { price: priceRange } : {}),
    ...(attrs?.yearMin != null ? { attrYear: { gte: attrs.yearMin } } : {}),
    ...(attrs?.kmMax != null ? { attrMileageKm: { lte: attrs.kmMax } } : {}),
    ...(attrs?.surfaceMin != null
      ? { attrSurfaceM2: { gte: attrs.surfaceMin } }
      : {}),
    ...(attrs?.rooms != null ? { attrRooms: { gte: attrs.rooms } } : {}),
    ...(attrs?.fuel ? { attrFuel: attrs.fuel } : {}),
    // `brand` est un contains insensitive — l'utilisateur tape "peugeot"
    // et on matche "Peugeot", "PEUGEOT", etc. L'index btree (LIKE
    // `peugeot%`) n'est pas utilisé avec contains, mais sur une annonce
    // la cardinalité est largement tolérable à 100k.
    ...(attrs?.brand
      ? { attrBrand: { contains: attrs.brand, mode: "insensitive" } }
      : {}),
    ...(attrs?.contract ? { attrContract: attrs.contract } : {}),
    ...(search ?? {}),
  };
}

/**
 * Compte d'annonces publiées (non expirées) par catégorie — UNE requête
 * `groupBy`, pas N counts. Alimente la colonne catégories du catalogue :
 * les counts des feuilles sont sommés côté appelant pour les parents.
 */
// Les counts alimentent le méga-menu et l'accordéon de TOUTES les vues du
// catalogue : re-grouper la table à chaque rendu est inutile — un compteur
// en retard de 5 min est invisible pour l'utilisateur. `unstable_cache`
// partage le résultat entre requêtes ; tag `listing-counts` si on veut
// l'invalider à la publication un jour.
const cachedListingCategoryCounts = unstable_cache(
  async (): Promise<Record<string, number>> => {
    const rows = await prisma.listing.groupBy({
      by: ["categoryId"],
      where: {
        status: ListingStatus.PUBLISHED,
        expiresAt: { gt: new Date() },
      },
      _count: { _all: true },
    });
    return Object.fromEntries(
      rows
        .filter((r): r is typeof r & { categoryId: string } =>
          Boolean(r.categoryId),
        )
        .map((r) => [r.categoryId, r._count._all]),
    );
  },
  ["listing-category-counts-v1"],
  { revalidate: 300, tags: ["listing-counts"] },
);

export async function fetchListingCategoryCounts(): Promise<
  Record<string, number>
> {
  return cachedListingCategoryCounts();
}

export async function fetchListingsPage({
  sort,
  page,
  category,
  city,
  type,
  q,
  filters,
}: {
  sort: ListingsSort;
  page: number;
  category: string | null;
  city: string | null;
  type: ListingTypeSlug | null;
  q: string | null;
  filters?: Partial<ListingsFilters>;
}) {
  const where = buildWhere({ category, city, type, q, attrs: filters });
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

/**
 * Libellés de type de prix par langue — « par mois » sur un appartement
 * doit être en portugais pour un lecteur PT, en créole pour un lecteur HT.
 * Les montants restent formatés en EUR (fr-FR) : c'est la devise locale.
 */
const PRICE_TYPE_WORDS: Record<
  Locale,
  {
    free: string;
    onRequest: string;
    perMonth: string;
    perMonthNoAmount: string;
    perDay: string;
    perDayNoAmount: string;
    negotiable: string;
    negotiableNoAmount: string;
  }
> = {
  fr: {
    free: "Gratuit",
    onRequest: "Sur demande",
    perMonth: "/ mois",
    perMonthNoAmount: "Prix mensuel",
    perDay: "/ jour",
    perDayNoAmount: "Prix par jour",
    negotiable: "à débattre",
    negotiableNoAmount: "À débattre",
  },
  pt: {
    free: "Grátis",
    onRequest: "Sob consulta",
    perMonth: "/ mês",
    perMonthNoAmount: "Preço mensal",
    perDay: "/ dia",
    perDayNoAmount: "Preço por dia",
    negotiable: "negociável",
    negotiableNoAmount: "Negociável",
  },
  ht: {
    free: "Gratis",
    onRequest: "Sou demann",
    perMonth: "/ mwa",
    perMonthNoAmount: "Pri pa mwa",
    perDay: "/ jou",
    perDayNoAmount: "Pri pa jou",
    negotiable: "pou negosye",
    negotiableNoAmount: "Pou negosye",
  },
};

export function formatPriceType(
  priceType: PriceType,
  price: Prisma.Decimal | null,
  locale: Locale = "fr",
): string {
  const amount = price ? Number(price.toString()) : null;
  const words = PRICE_TYPE_WORDS[locale];
  const fmt = (n: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(n);

  switch (priceType) {
    case "FREE":
      return words.free;
    case "ON_REQUEST":
      return words.onRequest;
    case "PER_MONTH":
      return amount !== null
        ? `${fmt(amount)} ${words.perMonth}`
        : words.perMonthNoAmount;
    case "PER_DAY":
      return amount !== null
        ? `${fmt(amount)} ${words.perDay}`
        : words.perDayNoAmount;
    case "NEGOTIABLE":
      return amount !== null
        ? `${fmt(amount)} ${words.negotiable}`
        : words.negotiableNoAmount;
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
