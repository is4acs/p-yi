import { prisma } from "@/lib/prisma";
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

  // `Promise.allSettled` pour que le sitemap continue à se construire
  // même si une seule requête Prisma échoue (DB indisponible au build,
  // pool saturé, etc.). On logge puis on retombe sur les valeurs
  // neutres — le build n'a PAS le droit de casser à cause d'une sitemap.
  const results = await Promise.allSettled([
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
    prisma.deal.count({
      where: {
        status: "PUBLISHED",
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    }),
    prisma.listing.count({
      where: { status: "PUBLISHED", expiresAt: { gt: now } },
    }),
    prisma.deal.findFirst({
      where: {
        status: "PUBLISHED",
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
    prisma.listing.findFirst({
      where: { status: "PUBLISHED", expiresAt: { gt: now } },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
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
  // Si Prisma est injoignable au build (DB pas encore migrée, secret
  // Vercel manquant en preview, etc.), on retourne un sitemap vide
  // plutôt que de faire échouer l'export Next. ISR (`revalidate=3600`
  // côté route) refera la requête au premier hit runtime et le
  // sitemap se remplira tout seul.
  const deals = await prisma.deal
    .findMany({
      where: {
        status: "PUBLISHED",
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error("[sitemap/deals] query failed", err);
      return [] as Array<{ slug: string; updatedAt: Date }>;
    });

  return deals.map((deal) => ({
    loc: `${base}/bons-plans/${deal.slug}`,
    lastmod: deal.updatedAt,
    changefreq: "weekly",
    priority: 0.7,
  }));
}

export async function getListingsEntries(): Promise<SitemapUrlEntry[]> {
  const base = getSiteUrl();
  const listings = await prisma.listing
    .findMany({
      where: { status: "PUBLISHED", expiresAt: { gt: new Date() } },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error("[sitemap/listings] query failed", err);
      return [] as Array<{ slug: string; updatedAt: Date }>;
    });

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

  type DealRow = {
    slug: string;
    updatedAt: Date;
    coverImageUrl: string | null;
    images: { url: string }[];
  };
  type ListingRow = DealRow;

  // Cf. `getDealsEntries` : on absorbe les erreurs Prisma au build
  // pour ne pas casser l'export Next. `Promise.allSettled` plutôt
  // qu'un .catch() global pour qu'un crash sur une seule requête
  // n'efface pas l'autre.
  const [dealsResult, listingsResult] = await Promise.allSettled([
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
  ]);

  if (dealsResult.status === "rejected") {
    // eslint-disable-next-line no-console
    console.error("[sitemap/images] deals query failed", dealsResult.reason);
  }
  if (listingsResult.status === "rejected") {
    // eslint-disable-next-line no-console
    console.error(
      "[sitemap/images] listings query failed",
      listingsResult.reason,
    );
  }
  const deals: DealRow[] =
    dealsResult.status === "fulfilled" ? dealsResult.value : [];
  const listings: ListingRow[] =
    listingsResult.status === "fulfilled" ? listingsResult.value : [];

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
