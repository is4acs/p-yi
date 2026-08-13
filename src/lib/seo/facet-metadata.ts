import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { withTimeout } from "@/lib/async/with-timeout";

/**
 * Metadata des vues facettées des deux catalogues (/annonces et
 * /bons-plans) — même logique des deux côtés, auparavant dupliquée à
 * ~90 % dans chaque page :
 *
 *  - les slugs `category`/`city` sont résolus en noms humains pour un
 *    titre SEO de qualité (UNE requête, timeout court, repli sur le
 *    slug brut si la DB hoquette — pendant generateMetadata, un crash
 *    Prisma enverrait toute la page sur le boundary global) ;
 *  - toute vue filtrée/recherchée reste noindex (l'appelant décide via
 *    `isFilteredView`) : les pages piliers dédiées portent l'indexation
 *    locale, on n'indexe pas les variantes combinatoires.
 */

const METADATA_TIMEOUT_MS = 2_000;

export async function resolveFacetNames({
  categorySlug,
  citySlug,
  logLabel,
}: {
  categorySlug: string | null;
  citySlug: string | null;
  /** Préfixe des logs d'échec, ex. "listings" ou "deals". */
  logLabel: string;
}): Promise<{ categoryName: string | null; cityName: string | null }> {
  try {
    const [category, city] = await withTimeout(
      Promise.all([
        categorySlug
          ? prisma.category.findUnique({
              where: { slug: categorySlug },
              select: { name: true },
            })
          : null,
        citySlug
          ? prisma.city.findUnique({
              where: { slug: citySlug },
              select: { name: true },
            })
          : null,
      ]),
      METADATA_TIMEOUT_MS,
      `${logLabel}/metadata-facets`,
    );
    return {
      categoryName: category?.name ?? categorySlug ?? null,
      cityName: city?.name ?? citySlug ?? null,
    };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[${logLabel}/metadata] facet resolution failed`, {
      categorySlug,
      citySlug,
      err,
    });
    return {
      categoryName: categorySlug ?? null,
      cityName: citySlug ?? null,
    };
  }
}

export async function buildFacetMetadata({
  categorySlug,
  citySlug,
  isFilteredView,
  facetCanonical,
  basePath,
  titlePrefix,
  facetDescription,
  defaultTitle,
  defaultDescription,
  logLabel,
}: {
  categorySlug: string | null;
  citySlug: string | null;
  /** true → noindex (facette, recherche, tri, pagination…). */
  isFilteredView: boolean;
  /** Canonical de la vue facettée (peut pointer vers une page pilier). */
  facetCanonical: string;
  /** Chemin de la liste nue, ex. "/annonces". */
  basePath: string;
  /** Préfixe du titre facetté, ex. "Annonces" → « Annonces Voitures · Cayenne ». */
  titlePrefix: string;
  /** Description facettée, reçoit le label humain (ex. "voitures · cayenne"). */
  facetDescription: (label: string) => string;
  defaultTitle: string;
  defaultDescription: string;
  logLabel: string;
}): Promise<Metadata> {
  const { categoryName, cityName } = await resolveFacetNames({
    categorySlug,
    citySlug,
    logLabel,
  });

  const parts: string[] = [];
  if (categoryName) parts.push(categoryName);
  if (cityName) parts.push(cityName);

  if (parts.length > 0) {
    const label = parts.join(" · ");
    const title = `${titlePrefix} ${label}`;
    const description = facetDescription(label.toLowerCase());
    return {
      title,
      description,
      alternates: { canonical: facetCanonical },
      robots: { index: !isFilteredView, follow: true },
      openGraph: { title, description, url: facetCanonical },
      twitter: { title, description, card: "summary_large_image" },
    };
  }

  return {
    title: defaultTitle,
    description: defaultDescription,
    alternates: { canonical: basePath },
    robots: { index: true, follow: true },
    openGraph: { title: defaultTitle, description: defaultDescription, url: basePath },
    twitter: {
      title: defaultTitle,
      description: defaultDescription,
      card: "summary_large_image",
    },
  };
}
