import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DealsPillarPage } from "@/components/seo/DealsPillarPage";
import { withTimeout } from "@/lib/async/with-timeout";
import { buildSeoMetadata } from "@/lib/seo/metadata";
import {
  buildDealsCategoryExploreLinks,
  buildDealsCityExploreLinks,
  buildDealsFaq,
  buildDealsGlobalExploreLinks,
  buildDealsGlobalIntro,
  buildDealsCityIntro,
  buildDealsCategoryIntro,
} from "@/lib/seo/pillar-content";
import {
  CORE_CITIES,
  DEAL_CATEGORY_PILLARS,
  MIN_INDEXABLE_PILLAR_ITEMS,
  getCityBySlug,
  getDealCategoryBySlug,
  getDealsCategoryPath,
  getDealsCityPath,
} from "@/lib/seo/local-pages";
import { countDealsForPillar } from "@/lib/seo/pillar-queries";

const ROOT_BREADCRUMB = [
  { name: "Accueil", url: "/" },
  { name: "Bons plans", url: "/bons-plans" },
];
const PILLAR_METADATA_TIMEOUT_MS = 2_000;

export function getDealsCityStaticParams() {
  return CORE_CITIES.map((city) => ({ city: city.slug }));
}

export function getDealsCategoryStaticParams() {
  return DEAL_CATEGORY_PILLARS.map((category) => ({ category: category.slug }));
}

async function isDealsPillarIndexable(input: {
  citySlug?: string | null;
  categorySlug?: string | null;
}): Promise<boolean> {
  // Cf. `isListingsPillarIndexable` — on absorbe les erreurs Prisma
  // pour ne jamais casser la génération des metadata, et on tombe
  // côté `noindex` par défaut si on ne peut pas lire le count.
  try {
    const count = await withTimeout(
      countDealsForPillar(input),
      PILLAR_METADATA_TIMEOUT_MS,
      "deals/pillar-count",
    );
    return count >= MIN_INDEXABLE_PILLAR_ITEMS;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[deals/pillar/metadata] count failed", { input, err });
    return false;
  }
}

export async function buildDealsGlobalMetadata(): Promise<Metadata> {
  const index = await isDealsPillarIndexable({});
  return buildSeoMetadata({
    title: "Bons plans en Guyane",
    description:
      "Retrouve les bons plans en Guyane: promos locales, offres par ville et réductions utiles près de chez toi.",
    canonical: "/bons-plans/guyane",
    index,
  });
}

export async function buildDealsCityMetadata(citySlug: string): Promise<Metadata> {
  const city = getCityBySlug(citySlug);
  if (!city) notFound();
  const index = await isDealsPillarIndexable({ citySlug: city.slug });

  return buildSeoMetadata({
    title: `Bons plans à ${city.name}`,
    description: `Découvre les bons plans à ${city.name}: promos locales, offres utiles et deals récents partagés en Guyane.`,
    canonical: getDealsCityPath(city.slug),
    index,
  });
}

export async function buildDealsCategoryMetadata(
  categorySlug: string,
): Promise<Metadata> {
  const category = getDealCategoryBySlug(categorySlug);
  if (!category) notFound();
  const index = await isDealsPillarIndexable({ categorySlug: category.slug });

  return buildSeoMetadata({
    title: `Bons plans ${category.name} en Guyane`,
    description: `Les bons plans ${category.name.toLowerCase()} en Guyane: offres locales, promos fraîches et comparatif rapide par ville.`,
    canonical: getDealsCategoryPath(category.slug),
    index,
  });
}

export async function renderDealsGlobalPage() {
  return (
    <DealsPillarPage
      canonicalPath="/bons-plans/guyane"
      h1="Bons plans en Guyane"
      eyebrow="Promos locales 100% Guyane"
      intro={buildDealsGlobalIntro()}
      filters={{}}
      breadcrumb={[...ROOT_BREADCRUMB, { name: "Guyane", url: "/bons-plans/guyane" }]}
      faq={buildDealsFaq("en Guyane")}
      exploreLinks={buildDealsGlobalExploreLinks()}
    />
  );
}

export async function renderDealsCityPage(citySlug: string) {
  const city = getCityBySlug(citySlug);
  if (!city) notFound();

  return (
    <DealsPillarPage
      canonicalPath={getDealsCityPath(city.slug)}
      h1={`Bons plans à ${city.name}`}
      eyebrow="Promos locales par commune"
      intro={buildDealsCityIntro(city)}
      filters={{ citySlug: city.slug }}
      breadcrumb={[
        ...ROOT_BREADCRUMB,
        { name: "Guyane", url: "/bons-plans/guyane" },
        { name: city.name, url: getDealsCityPath(city.slug) },
      ]}
      faq={buildDealsFaq(`à ${city.name}`)}
      exploreLinks={buildDealsCityExploreLinks(city)}
    />
  );
}

export async function renderDealsCategoryPage(categorySlug: string) {
  const category = getDealCategoryBySlug(categorySlug);
  if (!category) notFound();

  return (
    <DealsPillarPage
      canonicalPath={getDealsCategoryPath(category.slug)}
      h1={`Bons plans ${category.name} en Guyane`}
      eyebrow="Promos locales par catégorie"
      intro={buildDealsCategoryIntro(category)}
      filters={{ categorySlug: category.slug }}
      breadcrumb={[
        ...ROOT_BREADCRUMB,
        { name: "Guyane", url: "/bons-plans/guyane" },
        {
          name: category.name,
          url: getDealsCategoryPath(category.slug),
        },
      ]}
      faq={buildDealsFaq(`${category.name.toLowerCase()} en Guyane`)}
      exploreLinks={buildDealsCategoryExploreLinks(category)}
    />
  );
}
