import { prisma } from "@/lib/prisma";
import { withTimeout } from "@/lib/async/with-timeout";
import { getSiteUrl } from "@/lib/site-url";
import {
  CORE_CITIES,
  DEAL_CATEGORY_PILLARS,
  LISTING_CATEGORY_PILLARS,
  MIN_INDEXABLE_PILLAR_ITEMS,
  MIN_INDEXABLE_STORE_DEALS,
  STORE_PILLARS,
  getDealsCategoryPath,
  getDealsCityPath,
  getListingsCategoryPath,
  getListingsCityPath,
  getStorePath,
} from "@/lib/seo/local-pages";

type ChangeFreq =
  | "always"
  | "hourly"
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly"
  | "never";

export type SitemapUrlEntry = {
  loc: string;
  lastmod?: Date | string;
  changefreq?: ChangeFreq;
  priority?: number;
  images?: string[];
};

type SitemapIndexEntry = {
  loc: string;
  lastmod?: Date | string;
};
const SITEMAP_QUERY_TIMEOUT_MS = 4_500;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toIso(value: Date | string | undefined): string | null {
  if (!value) return null;
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function toAbsoluteUrl(pathOrUrl: string, base: string): string {
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl;
  }

  if (pathOrUrl.startsWith("/")) {
    return `${base}${pathOrUrl}`;
  }

  return `${base}/${pathOrUrl}`;
}

export function buildSitemapIndexXml(entries: SitemapIndexEntry[]): string {
  const body = entries
    .map((entry) => {
      const lastmod = toIso(entry.lastmod);
      return [
        "  <sitemap>",
        `    <loc>${escapeXml(entry.loc)}</loc>`,
        lastmod ? `    <lastmod>${lastmod}</lastmod>` : null,
        "  </sitemap>",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    body,
    "</sitemapindex>",
  ].join("\n");
}

export function buildUrlSetXml(entries: SitemapUrlEntry[]): string {
  const hasImages = entries.some((entry) => (entry.images?.length ?? 0) > 0);
  const xmlns = hasImages
    ? 'xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"'
    : "";

  const body = entries
    .map((entry) => {
      const lastmod = toIso(entry.lastmod);
      const imageLines = (entry.images ?? [])
        .map((image) => {
          return [
            "    <image:image>",
            `      <image:loc>${escapeXml(image)}</image:loc>`,
            "    </image:image>",
          ].join("\n");
        })
        .join("\n");

      return [
        "  <url>",
        `    <loc>${escapeXml(entry.loc)}</loc>`,
        lastmod ? `    <lastmod>${lastmod}</lastmod>` : null,
        entry.changefreq ? `    <changefreq>${entry.changefreq}</changefreq>` : null,
        typeof entry.priority === "number"
          ? `    <priority>${entry.priority.toFixed(1)}</priority>`
          : null,
        imageLines || null,
        "  </url>",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ${xmlns}>`,
    body,
    "</urlset>",
  ].join("\n");
}

export async function getStaticPagesEntries(): Promise<SitemapUrlEntry[]> {
  const base = getSiteUrl();
  const now = new Date();

  // `Promise.allSettled` + fallback par requête : un hiccup Prisma au
  // build (DB pas prête, pool saturé, pas de secret dans un preview
  // Vercel) ne doit PAS casser `next build`. On retombe sur des valeurs
  // neutres — le sitemap se reconstruira au runtime via ISR.
  const results = await Promise.allSettled([
    withTimeout(
      prisma.store.findMany({
        where: { slug: { in: STORE_PILLARS.map((store) => store.slug) } },
        select: {
          slug: true,
          _count: {
            select: {
              deals: {
                where: {
                  status: "PUBLISHED",
                  OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
                },
              },
            },
          },
        },
      }),
      SITEMAP_QUERY_TIMEOUT_MS,
      "sitemap/pages-stores",
    ),
    withTimeout(
      prisma.city.findMany({
        where: { slug: { in: CORE_CITIES.map((city) => city.slug) } },
        select: {
          slug: true,
          _count: {
            select: {
              deals: {
                where: {
                  status: "PUBLISHED",
                  OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
                },
              },
              listings: {
                where: { status: "PUBLISHED", expiresAt: { gt: now } },
              },
            },
          },
        },
      }),
      SITEMAP_QUERY_TIMEOUT_MS,
      "sitemap/pages-cities",
    ),
    withTimeout(
      prisma.category.findMany({
        where: {
          slug: {
            in: [
              ...DEAL_CATEGORY_PILLARS.map((category) => category.slug),
              ...LISTING_CATEGORY_PILLARS.map((category) => category.slug),
            ],
          },
        },
        select: {
          slug: true,
          _count: {
            select: {
              deals: {
                where: {
                  status: "PUBLISHED",
                  OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
                },
              },
              listings: {
                where: { status: "PUBLISHED", expiresAt: { gt: now } },
              },
            },
          },
        },
      }),
      SITEMAP_QUERY_TIMEOUT_MS,
      "sitemap/pages-categories",
    ),
    withTimeout(
      prisma.deal.count({
        where: {
          status: "PUBLISHED",
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
      }),
      SITEMAP_QUERY_TIMEOUT_MS,
      "sitemap/pages-deals-total",
    ),
    withTimeout(
      prisma.listing.count({
        where: { status: "PUBLISHED", expiresAt: { gt: now } },
      }),
      SITEMAP_QUERY_TIMEOUT_MS,
      "sitemap/pages-listings-total",
    ),
    withTimeout(
      prisma.deal.findFirst({
        where: {
          status: "PUBLISHED",
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        orderBy: { updatedAt: "desc" },
        select: { updatedAt: true },
      }),
      SITEMAP_QUERY_TIMEOUT_MS,
      "sitemap/pages-latest-deal",
    ),
    withTimeout(
      prisma.listing.findFirst({
        where: { status: "PUBLISHED", expiresAt: { gt: now } },
        orderBy: { updatedAt: "desc" },
        select: { updatedAt: true },
      }),
      SITEMAP_QUERY_TIMEOUT_MS,
      "sitemap/pages-latest-listing",
    ),
  ]);

  type StoreCount = { slug: string; _count: { deals: number } };
  type CityCount = {
    slug: string;
    _count: { deals: number; listings: number };
  };
  type CategoryCount = CityCount;
  type LatestUpdate = { updatedAt: Date } | null;

  const unwrap = <T>(i: number, fallback: T): T => {
    const r = results[i];
    if (r.status === "fulfilled") return r.value as T;
    // eslint-disable-next-line no-console
    console.error(`[sitemap/pages] query #${i} failed`, r.reason);
    return fallback;
  };

  const storeCounts = unwrap<StoreCount[]>(0, []);
  const cityCounts = unwrap<CityCount[]>(1, []);
  const categoryCounts = unwrap<CategoryCount[]>(2, []);
  const dealsTotal = unwrap<number>(3, 0);
  const listingsTotal = unwrap<number>(4, 0);
  const latestDeal = unwrap<LatestUpdate>(5, null);
  const latestListing = unwrap<LatestUpdate>(6, null);

  const marketplaceLastmod =
    latestDeal && latestListing
      ? latestDeal.updatedAt > latestListing.updatedAt
        ? latestDeal.updatedAt
        : latestListing.updatedAt
      : latestDeal?.updatedAt ?? latestListing?.updatedAt ?? now;

  const indexableStoreSlugs = storeCounts
    .filter((store) => store._count.deals >= MIN_INDEXABLE_STORE_DEALS)
    .map((store) => store.slug);

  const staticPaths: Array<{
    path: string;
    changefreq: ChangeFreq;
    priority: number;
    lastmod?: Date;
  }> = [
    {
      path: "/",
      changefreq: "daily",
      priority: 1,
      lastmod: marketplaceLastmod,
    },
    {
      path: "/bons-plans",
      changefreq: "daily",
      priority: 0.9,
      lastmod: marketplaceLastmod,
    },
    {
      path: "/annonces",
      changefreq: "daily",
      priority: 0.9,
      lastmod: marketplaceLastmod,
    },
    ...(dealsTotal >= MIN_INDEXABLE_PILLAR_ITEMS
      ? [
          {
            path: "/bons-plans/guyane",
            changefreq: "daily" as const,
            priority: 0.9,
            lastmod: marketplaceLastmod,
          },
        ]
      : []),
    ...(listingsTotal >= MIN_INDEXABLE_PILLAR_ITEMS
      ? [
          {
            path: "/annonces/guyane",
            changefreq: "daily" as const,
            priority: 0.9,
            lastmod: marketplaceLastmod,
          },
        ]
      : []),
    {
      path: "/guide/bons-plans-guyane",
      changefreq: "monthly",
      priority: 0.7,
    },
    {
      path: "/guide/petites-annonces-guyane",
      changefreq: "monthly",
      priority: 0.7,
    },
    {
      path: "/guide/vendre-sa-voiture-en-guyane",
      changefreq: "monthly",
      priority: 0.7,
    },
    {
      path: "/guide/trouver-un-appartement-en-guyane",
      changefreq: "monthly",
      priority: 0.7,
    },
    { path: "/confidentialite", changefreq: "yearly", priority: 0.2 },
    { path: "/cgu", changefreq: "yearly", priority: 0.2 },
    { path: "/cookies", changefreq: "yearly", priority: 0.2 },
    { path: "/mentions-legales", changefreq: "yearly", priority: 0.2 },
  ];

  const cityCountBySlug = new Map(
    cityCounts.map((city) => [city.slug, city._count]),
  );
  const categoryCountBySlug = new Map(
    categoryCounts.map((category) => [category.slug, category._count]),
  );

  const cityPaths = CORE_CITIES.flatMap((city) => {
    const counts = cityCountBySlug.get(city.slug);
    return [
      ...(counts && counts.deals >= MIN_INDEXABLE_PILLAR_ITEMS
        ? [getDealsCityPath(city.slug)]
        : []),
      ...(counts && counts.listings >= MIN_INDEXABLE_PILLAR_ITEMS
        ? [getListingsCityPath(city.slug)]
        : []),
    ];
  });

  const categoryPaths = [
    ...DEAL_CATEGORY_PILLARS.flatMap((category) => {
      const counts = categoryCountBySlug.get(category.slug);
      return counts && counts.deals >= MIN_INDEXABLE_PILLAR_ITEMS
        ? [getDealsCategoryPath(category.slug)]
        : [];
    }),
    ...LISTING_CATEGORY_PILLARS.flatMap((category) => {
      const counts = categoryCountBySlug.get(category.slug);
      return counts && counts.listings >= MIN_INDEXABLE_PILLAR_ITEMS
        ? [getListingsCategoryPath(category.slug)]
        : [];
    }),
  ];

  const storePaths = indexableStoreSlugs.map((slug) => getStorePath(slug));

  const allEntries: SitemapUrlEntry[] = [
    ...staticPaths.map((entry) => ({
      loc: toAbsoluteUrl(entry.path, base),
      lastmod: entry.lastmod,
      changefreq: entry.changefreq,
      priority: entry.priority,
    })),
    ...cityPaths.map((path) => ({
      loc: toAbsoluteUrl(path, base),
      lastmod: marketplaceLastmod,
      changefreq: "weekly" as const,
      priority: 0.8,
    })),
    ...categoryPaths.map((path) => ({
      loc: toAbsoluteUrl(path, base),
      lastmod: marketplaceLastmod,
      changefreq: "weekly" as const,
      priority: 0.8,
    })),
    ...storePaths.map((path) => ({
      loc: toAbsoluteUrl(path, base),
      lastmod: marketplaceLastmod,
      changefreq: "weekly" as const,
      priority: 0.7,
    })),
  ];

  return allEntries;
}

export async function getDealsEntries(): Promise<SitemapUrlEntry[]> {
  const base = getSiteUrl();
  const now = new Date();
  let deals: Array<{ slug: string; updatedAt: Date }> = [];
  try {
    deals = await withTimeout(
      prisma.deal.findMany({
        where: {
          status: "PUBLISHED",
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
      }),
      SITEMAP_QUERY_TIMEOUT_MS,
      "sitemap/deals",
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[sitemap/deals] fetch failed", err);
    return [];
  }

  return deals.map((deal) => ({
    loc: `${base}/bons-plans/${deal.slug}`,
    lastmod: deal.updatedAt,
    changefreq: "weekly",
    priority: 0.7,
  }));
}

export async function getListingsEntries(): Promise<SitemapUrlEntry[]> {
  const base = getSiteUrl();
  let listings: Array<{ slug: string; updatedAt: Date }> = [];
  try {
    listings = await withTimeout(
      prisma.listing.findMany({
        where: { status: "PUBLISHED", expiresAt: { gt: new Date() } },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
      }),
      SITEMAP_QUERY_TIMEOUT_MS,
      "sitemap/listings",
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[sitemap/listings] fetch failed", err);
    return [];
  }

  return listings.map((listing) => ({
    loc: `${base}/annonces/${listing.slug}`,
    lastmod: listing.updatedAt,
    changefreq: "weekly",
    priority: 0.7,
  }));
}

export async function getImagesEntries(): Promise<SitemapUrlEntry[]> {
  const base = getSiteUrl();
  const now = new Date();
  type DealImageRow = {
    slug: string;
    updatedAt: Date;
    coverImageUrl: string | null;
    images: Array<{ url: string }>;
  };
  type ListingImageRow = {
    slug: string;
    updatedAt: Date;
    coverImageUrl: string | null;
    images: Array<{ url: string }>;
  };

  let deals: DealImageRow[] = [];
  let listings: ListingImageRow[] = [];
  try {
    [deals, listings] = await withTimeout(
      Promise.all([
        prisma.deal.findMany({
          where: {
            status: "PUBLISHED",
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          },
          select: {
            slug: true,
            updatedAt: true,
            coverImageUrl: true,
            images: {
              orderBy: { sortOrder: "asc" },
              select: { url: true },
              take: 4,
            },
          },
        }),
        prisma.listing.findMany({
          where: { status: "PUBLISHED", expiresAt: { gt: now } },
          select: {
            slug: true,
            updatedAt: true,
            coverImageUrl: true,
            images: {
              orderBy: { sortOrder: "asc" },
              select: { url: true },
              take: 4,
            },
          },
        }),
      ]),
      SITEMAP_QUERY_TIMEOUT_MS,
      "sitemap/images",
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[sitemap/images] fetch failed", err);
    return [];
  }

  const dealEntries: SitemapUrlEntry[] = [];
  for (const deal of deals) {
    const rawImages = [deal.coverImageUrl, ...deal.images.map((img) => img.url)].filter(
      (value): value is string => Boolean(value),
    );
    const images = Array.from(new Set(rawImages)).map((image) =>
      toAbsoluteUrl(image, base),
    );
    if (images.length === 0) continue;

    dealEntries.push({
      loc: `${base}/bons-plans/${deal.slug}`,
      lastmod: deal.updatedAt,
      images,
    });
  }

  const listingEntries: SitemapUrlEntry[] = [];
  for (const listing of listings) {
    const rawImages = [
      listing.coverImageUrl,
      ...listing.images.map((img) => img.url),
    ].filter((value): value is string => Boolean(value));
    const images = Array.from(new Set(rawImages)).map((image) =>
      toAbsoluteUrl(image, base),
    );
    if (images.length === 0) continue;

    listingEntries.push({
      loc: `${base}/annonces/${listing.slug}`,
      lastmod: listing.updatedAt,
      images,
    });
  }

  return [...dealEntries, ...listingEntries];
}

export function buildSitemapIndexEntries(base: string): SitemapIndexEntry[] {
  return [
    { loc: `${base}/sitemap-pages.xml` },
    { loc: `${base}/sitemap-deals.xml` },
    { loc: `${base}/sitemap-annonces.xml` },
    { loc: `${base}/sitemap-images.xml` },
  ];
}
