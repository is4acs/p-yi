import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Map } from "lucide-react";

import { ActivityDetailContent } from "@/components/activities/ActivityDetailContent";
import { ExplorerAlso } from "@/components/seo/SeoBlocks";
import { withTimeout } from "@/lib/async/with-timeout";
import {
  bumpActivityViewCount,
  getPublishedActivityBySlug,
  getPublishedActivitySlugs,
} from "@/lib/activities/queries";
import { ACTIVITY_CATEGORIES } from "@/lib/activities/labels";
import { parseOpeningHours } from "@/lib/activities/opening-hours";
import { serializeActivityDetail } from "@/lib/activities/types";
import { rethrowIfNextInternal } from "@/lib/next-errors";
import {
  buildBreadcrumbJsonLd,
  buildTouristAttractionJsonLd,
  serializeJsonLd,
} from "@/lib/seo/json-ld";
import {
  getActivitiesCategoryPath,
  getActivitiesCityPath,
  getActivityCategoryPillarBySlug,
  getActivityCityBySlug,
} from "@/lib/seo/local-pages";
import { buildSeoMetadata } from "@/lib/seo/metadata";
import { getSiteUrl } from "@/lib/site-url";
import type { ExploreLink } from "@/lib/seo/local-pages";

/**
 * /activites/[slug] — fiche activité, entièrement Server Component.
 * ISR (revalidate 300 s) + generateStaticParams : les fiches publiées
 * sont pré-rendues au build, les nouvelles apparaissent à la volée.
 * Le contenu réutilise ActivityDetailContent (single source of truth
 * avec le panneau carte) — un Client Component est rendu côté serveur
 * par Next, le HTML est donc complet pour les crawlers.
 */

export const revalidate = 300;

const DETAIL_DATA_TIMEOUT_MS = 4_500;
const DETAIL_METADATA_TIMEOUT_MS = 2_500;

export async function generateStaticParams() {
  // Build sans DB (CI, preview) : on rend zéro fiche au build, elles
  // seront générées à la première visite via dynamicParams (défaut).
  try {
    const rows = await withTimeout(
      getPublishedActivitySlugs(),
      DETAIL_DATA_TIMEOUT_MS,
      "activites/static-params",
    );
    return rows.map((row) => ({ slug: row.slug }));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[activites/detail] static params failed", err);
    return [];
  }
}

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const activity = await withTimeout(
    getPublishedActivityBySlug(slug),
    DETAIL_METADATA_TIMEOUT_MS,
    "activites/detail-metadata",
  ).catch((err) => {
    rethrowIfNextInternal(err);
    // eslint-disable-next-line no-console
    console.error("[activites/detail] metadata fetch failed", { slug, err });
    return null;
  });

  if (!activity) notFound();

  const category = ACTIVITY_CATEGORIES[activity.category];
  const metadata = buildSeoMetadata({
    title: `${activity.name} — ${category.label} à ${activity.city.name}`,
    description: activity.tagline,
    canonical: `/activites/${activity.slug}`,
    type: "article",
  });

  const cover = activity.images[0]?.url;
  if (cover) {
    metadata.openGraph = { ...metadata.openGraph, images: [cover] };
    metadata.twitter = { ...metadata.twitter, images: [cover] };
  }
  return metadata;
}

export default async function ActivityDetailPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;

  const activity = await withTimeout(
    getPublishedActivityBySlug(slug),
    DETAIL_DATA_TIMEOUT_MS,
    "activites/detail-page",
  ).catch((err) => {
    rethrowIfNextInternal(err);
    // eslint-disable-next-line no-console
    console.error("[activites/detail] fetch failed", { slug, err });
    return null;
  });

  if (!activity) notFound();

  bumpActivityViewCount(activity.id);

  const detail = serializeActivityDetail(activity);
  const category = ACTIVITY_CATEGORIES[activity.category];
  const base = getSiteUrl();

  const jsonLd = serializeJsonLd([
    buildTouristAttractionJsonLd({
      slug: activity.slug,
      name: activity.name,
      description: activity.tagline,
      latitude: activity.latitude,
      longitude: activity.longitude,
      cityName: activity.city.name,
      address: activity.address,
      images: activity.images.map((image) => image.url),
      isFree: activity.isFree,
      priceMinCents: activity.priceMinCents,
      bookingUrl: activity.bookingUrl,
      phone: activity.phone,
      website: activity.website,
      openingHours: parseOpeningHours(activity.openingHours),
    }),
    buildBreadcrumbJsonLd([
      { name: "Accueil", url: "/" },
      { name: "Activités", url: "/activites" },
      { name: category.label, url: getActivitiesCategoryPath(category.slug) },
      { name: activity.name, url: `${base}/activites/${activity.slug}` },
    ]),
  ]);

  // Maillage interne : carte centrée sur le lieu, pilier catégorie,
  // pilier ville quand la commune en a un, hub Guyane.
  const cityPillar = getActivityCityBySlug(activity.city.slug);
  const categoryPillar = getActivityCategoryPillarBySlug(category.slug);
  const exploreLinks: ExploreLink[] = [
    ...(categoryPillar
      ? [
          {
            href: getActivitiesCategoryPath(categoryPillar.slug),
            label: `Voir les activités ${categoryPillar.name.toLowerCase()} en Guyane`,
          },
        ]
      : []),
    ...(cityPillar
      ? [
          {
            href: getActivitiesCityPath(cityPillar.slug),
            label: `Voir les activités autour de ${cityPillar.name}`,
          },
        ]
      : []),
    { href: "/activites/guyane", label: "Voir toutes les activités en Guyane" },
  ];

  return (
    <main className="mx-auto max-w-2xl px-4 pb-14 pt-4 animate-in fade-in duration-300 sm:pt-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />

      <nav className="mb-3 flex items-center justify-between gap-2">
        <Link
          href="/activites"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Toutes les activités
        </Link>
        <Link
          href={`/activites?lieu=${activity.slug}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-peyi-orange-300 hover:text-peyi-orange-700"
        >
          <Map className="h-3.5 w-3.5" aria-hidden />
          Voir sur la carte
        </Link>
      </nav>

      <article className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <h1 className="sr-only">
          {activity.name} — {category.label} à {activity.city.name}
        </h1>
        <ActivityDetailContent detail={detail} showFullPageLink={false} />
      </article>

      <div className="mt-5">
        <ExplorerAlso links={exploreLinks} />
      </div>
    </main>
  );
}
