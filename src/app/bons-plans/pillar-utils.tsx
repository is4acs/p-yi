import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DealsPillarPage } from "@/components/seo/DealsPillarPage";
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
  getCityBySlug,
  getDealCategoryBySlug,
  getDealsCategoryPath,
  getDealsCityPath,
} from "@/lib/seo/local-pages";

const ROOT_BREADCRUMB = [
  { name: "Accueil", url: "/" },
  { name: "Bons plans", url: "/bons-plans" },
];

export function getDealsCityStaticParams() {
  return CORE_CITIES.map((city) => ({ city: city.slug }));
}

export function getDealsCategoryStaticParams() {
  return DEAL_CATEGORY_PILLARS.map((category) => ({ category: category.slug }));
}

export function buildDealsGlobalMetadata(): Metadata {
  return buildSeoMetadata({
    title: "Bons plans en Guyane | Péyi",
    description:
      "Retrouve les bons plans en Guyane: promos locales, offres par ville et réductions utiles près de chez toi.",
    canonical: "/bons-plans/guyane",
  });
}

export function buildDealsCityMetadata(citySlug: string): Metadata {
  const city = getCityBySlug(citySlug);
  if (!city) notFound();

  return buildSeoMetadata({
    title: `Bons plans à ${city.name} | Péyi`,
    description: `Découvre les bons plans à ${city.name}: promos locales, offres utiles et deals récents partagés en Guyane.`,
    canonical: getDealsCityPath(city.slug),
  });
}

export function buildDealsCategoryMetadata(categorySlug: string): Metadata {
  const category = getDealCategoryBySlug(categorySlug);
  if (!category) notFound();

  return buildSeoMetadata({
    title: `Bons plans ${category.name} en Guyane | Péyi`,
    description: `Les bons plans ${category.name.toLowerCase()} en Guyane: offres locales, promos fraîches et comparatif rapide par ville.`,
    canonical: getDealsCategoryPath(category.slug),
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
