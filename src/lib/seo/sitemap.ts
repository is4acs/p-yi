import { prisma } from "@/lib/prisma";
import { getSiteUrl } from "@/lib/site-url";
import {
  CORE_CITIES,
  DEAL_CATEGORY_PILLARS,
  LISTING_CATEGORY_PILLARS,
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

  const storeCounts = await prisma.store.findMany({
    where: { slug: { in: STORE_PILLARS.map((store) => store.slug) } },
    select: {
      slug: true,
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
  const indexableStoreSlugs = storeCounts
    .filter((store) => store._count.deals >= MIN_INDEXABLE_STORE_DEALS)
    .map((store) => store.slug);

  const staticPaths = [
    { path: "/", changefreq: "daily" as const, priority: 1 },
    { path: "/bons-plans", changefreq: "daily" as const, priority: 0.9 },
    { path: "/annonces", changefreq: "daily" as const, priority: 0.9 },
    { path: "/bons-plans/guyane", changefreq: "daily" as const, priority: 0.9 },
    { path: "/annonces/guyane", changefreq: "daily" as const, priority: 0.9 },
    { path: "/guide/bons-plans-guyane", changefreq: "monthly" as const, priority: 0.7 },
    { path: "/guide/petites-annonces-guyane", changefreq: "monthly" as const, priority: 0.7 },
    {
      path: "/guide/vendre-sa-voiture-en-guyane",
      changefreq: "monthly" as const,
      priority: 0.7,
    },
    {
      path: "/guide/trouver-un-appartement-en-guyane",
      changefreq: "monthly" as const,
      priority: 0.7,
    },
    { path: "/confidentialite", changefreq: "yearly" as const, priority: 0.2 },
    { path: "/cgu", changefreq: "yearly" as const, priority: 0.2 },
    { path: "/cookies", changefreq: "yearly" as const, priority: 0.2 },
    { path: "/mentions-legales", changefreq: "yearly" as const, priority: 0.2 },
  ];

  const cityPaths = CORE_CITIES.flatMap((city) => [
    getDealsCityPath(city.slug),
    getListingsCityPath(city.slug),
  ]);

  const categoryPaths = [
    ...DEAL_CATEGORY_PILLARS.map((category) => getDealsCategoryPath(category.slug)),
    ...LISTING_CATEGORY_PILLARS.map((category) =>
      getListingsCategoryPath(category.slug),
    ),
  ];

  const storePaths = indexableStoreSlugs.map((slug) => getStorePath(slug));

  const allEntries: SitemapUrlEntry[] = [
    ...staticPaths.map((entry) => ({
      loc: toAbsoluteUrl(entry.path, base),
      lastmod: now,
      changefreq: entry.changefreq,
      priority: entry.priority,
    })),
    ...cityPaths.map((path) => ({
      loc: toAbsoluteUrl(path, base),
      lastmod: now,
      changefreq: "weekly" as const,
      priority: 0.8,
    })),
    ...categoryPaths.map((path) => ({
      loc: toAbsoluteUrl(path, base),
      lastmod: now,
      changefreq: "weekly" as const,
      priority: 0.8,
    })),
    ...storePaths.map((path) => ({
      loc: toAbsoluteUrl(path, base),
      lastmod: now,
      changefreq: "weekly" as const,
      priority: 0.7,
    })),
  ];

  return allEntries;
}

export async function getDealsEntries(): Promise<SitemapUrlEntry[]> {
  const base = getSiteUrl();
  const now = new Date();
  const deals = await prisma.deal.findMany({
    where: {
      status: "PUBLISHED",
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
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
  const listings = await prisma.listing.findMany({
    where: { status: "PUBLISHED", expiresAt: { gt: new Date() } },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
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

  const [deals, listings] = await Promise.all([
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
  const now = new Date();
  return [
    { loc: `${base}/sitemap-pages.xml`, lastmod: now },
    { loc: `${base}/sitemap-deals.xml`, lastmod: now },
    { loc: `${base}/sitemap-annonces.xml`, lastmod: now },
    { loc: `${base}/sitemap-images.xml`, lastmod: now },
  ];
}
