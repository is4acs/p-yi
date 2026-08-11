import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ActivitiesPillarPage } from "@/components/seo/ActivitiesPillarPage";
import { withTimeout } from "@/lib/async/with-timeout";
import { buildSeoMetadata } from "@/lib/seo/metadata";
import {
  buildActivitiesCategoryIntro,
  buildActivitiesCityIntro,
  buildActivitiesFaq,
  buildActivitiesGlobalIntro,
} from "@/lib/seo/pillar-content";
import {
  ACTIVITY_CATEGORY_PILLARS,
  ACTIVITY_CITY_PILLARS,
  MIN_INDEXABLE_PILLAR_ITEMS,
  getActivitiesCategoryPath,
  getActivitiesCityPath,
  getActivityCategoryPillarBySlug,
  getActivityCityBySlug,
} from "@/lib/seo/local-pages";
import { countActivitiesForPillar } from "@/lib/seo/pillar-queries";

const ROOT_BREADCRUMB = [
  { name: "Accueil", url: "/" },
  { name: "Activités", url: "/activites" },
];
const PILLAR_METADATA_TIMEOUT_MS = 2_000;

export function getActivitiesCityStaticParams() {
  return ACTIVITY_CITY_PILLARS.map((city) => ({ city: city.slug }));
}

export function getActivitiesCategoryStaticParams() {
  return ACTIVITY_CATEGORY_PILLARS.map((category) => ({
    category: category.slug,
  }));
}

async function isActivitiesPillarIndexable(input: {
  citySlug?: string | null;
  categorySlug?: string | null;
}): Promise<boolean> {
  // Cf. `isDealsPillarIndexable` — on absorbe les erreurs Prisma pour ne
  // jamais casser la génération des metadata, noindex par défaut.
  try {
    const count = await withTimeout(
      countActivitiesForPillar(input),
      PILLAR_METADATA_TIMEOUT_MS,
      "activites/pillar-count",
    );
    return count >= MIN_INDEXABLE_PILLAR_ITEMS;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[activites/pillar/metadata] count failed", { input, err });
    return false;
  }
}

export async function buildActivitiesGlobalMetadata(): Promise<Metadata> {
  const index = await isActivitiesPillarIndexable({});
  return buildSeoMetadata({
    title: "Activités et lieux à découvrir en Guyane",
    description:
      "Toutes les activités en Guyane: sentiers, cascades, îles, marais, sites du bagne, villages et sorties en pirogue — avec le mode d'accès et la meilleure saison pour chaque lieu.",
    canonical: "/activites/guyane",
    index,
  });
}

export async function buildActivitiesCityMetadata(
  citySlug: string,
): Promise<Metadata> {
  const city = getActivityCityBySlug(citySlug);
  if (!city) notFound();
  const index = await isActivitiesPillarIndexable({ citySlug: city.slug });

  return buildSeoMetadata({
    title: `Activités à ${city.name} et aux alentours`,
    description: `Que faire à ${city.name} ? Sites naturels, patrimoine, sorties en pirogue et découvertes locales — avec le mode d'accès, la durée et la meilleure saison pour chaque lieu.`,
    canonical: getActivitiesCityPath(city.slug),
    index,
  });
}

export async function buildActivitiesCategoryMetadata(
  categorySlug: string,
): Promise<Metadata> {
  const category = getActivityCategoryPillarBySlug(categorySlug);
  if (!category) notFound();
  const index = await isActivitiesPillarIndexable({
    categorySlug: category.slug,
  });

  return buildSeoMetadata({
    title: `Activités ${category.name.toLowerCase()} en Guyane`,
    description: `Les activités ${category.name.toLowerCase()} en Guyane: lieux géolocalisés avec mode d'accès (route, piste, pirogue, avion), durée, tarif et saisonnalité.`,
    canonical: getActivitiesCategoryPath(category.slug),
    index,
  });
}

export async function renderActivitiesGlobalPage() {
  return (
    <ActivitiesPillarPage
      canonicalPath="/activites/guyane"
      h1="Activités et lieux à découvrir en Guyane"
      eyebrow="Découverte 100% Guyane"
      intro={buildActivitiesGlobalIntro()}
      filters={{}}
      mapHref="/activites"
      breadcrumb={[
        ...ROOT_BREADCRUMB,
        { name: "Guyane", url: "/activites/guyane" },
      ]}
      faq={buildActivitiesFaq("en Guyane")}
    />
  );
}

export async function renderActivitiesCityPage(citySlug: string) {
  const city = getActivityCityBySlug(citySlug);
  if (!city) notFound();

  return (
    <ActivitiesPillarPage
      canonicalPath={getActivitiesCityPath(city.slug)}
      h1={`Activités à ${city.name} et aux alentours`}
      eyebrow="Découverte par commune"
      intro={buildActivitiesCityIntro(city)}
      filters={{ citySlug: city.slug }}
      mapHref={`/activites?commune=${city.slug}`}
      breadcrumb={[
        ...ROOT_BREADCRUMB,
        { name: "Guyane", url: "/activites/guyane" },
        { name: city.name, url: getActivitiesCityPath(city.slug) },
      ]}
      faq={buildActivitiesFaq(`à ${city.name}`)}
    />
  );
}

export async function renderActivitiesCategoryPage(categorySlug: string) {
  const category = getActivityCategoryPillarBySlug(categorySlug);
  if (!category) notFound();

  return (
    <ActivitiesPillarPage
      canonicalPath={getActivitiesCategoryPath(category.slug)}
      h1={`Activités ${category.name.toLowerCase()} en Guyane`}
      eyebrow="Découverte par catégorie"
      intro={buildActivitiesCategoryIntro(category)}
      filters={{ categorySlug: category.slug }}
      mapHref={`/activites?categorie=${category.slug}`}
      breadcrumb={[
        ...ROOT_BREADCRUMB,
        { name: "Guyane", url: "/activites/guyane" },
        {
          name: category.name,
          url: getActivitiesCategoryPath(category.slug),
        },
      ]}
      faq={buildActivitiesFaq(`${category.name.toLowerCase()} en Guyane`)}
    />
  );
}
