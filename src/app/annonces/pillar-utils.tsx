import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ListingsPillarPage } from "@/components/seo/ListingsPillarPage";
import { buildSeoMetadata } from "@/lib/seo/metadata";
import {
  buildListingsCategoryExploreLinks,
  buildListingsCityExploreLinks,
  buildListingsFaq,
  buildListingsGlobalExploreLinks,
  buildListingsGlobalIntro,
  buildListingsCityIntro,
  buildListingsCategoryIntro,
} from "@/lib/seo/pillar-content";
import {
  CORE_CITIES,
  LISTING_CATEGORY_PILLARS,
  getCityBySlug,
  getListingCategoryBySlug,
  getListingsCategoryPath,
  getListingsCityPath,
} from "@/lib/seo/local-pages";

const ROOT_BREADCRUMB = [
  { name: "Accueil", url: "/" },
  { name: "Annonces", url: "/annonces" },
];

export function getListingsCityStaticParams() {
  return CORE_CITIES.map((city) => ({ city: city.slug }));
}

export function getListingsCategoryStaticParams() {
  return LISTING_CATEGORY_PILLARS.map((category) => ({
    category: category.slug,
  }));
}

export function buildListingsGlobalMetadata(): Metadata {
  return buildSeoMetadata({
    title: "Petites annonces en Guyane | Péyi",
    description:
      "Toutes les petites annonces en Guyane: voitures, immobilier, emploi et offres locales par ville.",
    canonical: "/annonces/guyane",
  });
}

export function buildListingsCityMetadata(citySlug: string): Metadata {
  const city = getCityBySlug(citySlug);
  if (!city) notFound();

  return buildSeoMetadata({
    title: `Petites annonces à ${city.name} | Péyi`,
    description: `Consulte les annonces à ${city.name}: voitures, immobilier, emploi et services entre Guyanais.`,
    canonical: getListingsCityPath(city.slug),
  });
}

export function buildListingsCategoryMetadata(categorySlug: string): Metadata {
  const category = getListingCategoryBySlug(categorySlug);
  if (!category) notFound();

  return buildSeoMetadata({
    title: `Annonces ${category.name} en Guyane | Péyi`,
    description: `Explore les annonces ${category.name.toLowerCase()} en Guyane: offres locales, prix visibles et résultats par ville.`,
    canonical: getListingsCategoryPath(category.slug),
  });
}

export async function renderListingsGlobalPage() {
  return (
    <ListingsPillarPage
      canonicalPath="/annonces/guyane"
      h1="Petites annonces en Guyane"
      eyebrow="Marketplace locale 100% Guyane"
      intro={buildListingsGlobalIntro()}
      filters={{}}
      breadcrumb={[...ROOT_BREADCRUMB, { name: "Guyane", url: "/annonces/guyane" }]}
      faq={buildListingsFaq("en Guyane")}
      exploreLinks={buildListingsGlobalExploreLinks()}
    />
  );
}

export async function renderListingsCityPage(citySlug: string) {
  const city = getCityBySlug(citySlug);
  if (!city) notFound();

  return (
    <ListingsPillarPage
      canonicalPath={getListingsCityPath(city.slug)}
      h1={`Petites annonces à ${city.name}`}
      eyebrow="Annonces locales par commune"
      intro={buildListingsCityIntro(city)}
      filters={{ citySlug: city.slug }}
      breadcrumb={[
        ...ROOT_BREADCRUMB,
        { name: "Guyane", url: "/annonces/guyane" },
        { name: city.name, url: getListingsCityPath(city.slug) },
      ]}
      faq={buildListingsFaq(`à ${city.name}`)}
      exploreLinks={buildListingsCityExploreLinks(city)}
    />
  );
}

export async function renderListingsCategoryPage(categorySlug: string) {
  const category = getListingCategoryBySlug(categorySlug);
  if (!category) notFound();

  return (
    <ListingsPillarPage
      canonicalPath={getListingsCategoryPath(category.slug)}
      h1={`Annonces ${category.name} en Guyane`}
      eyebrow="Annonces locales par catégorie"
      intro={buildListingsCategoryIntro(category)}
      filters={{ categorySlug: category.slug }}
      breadcrumb={[
        ...ROOT_BREADCRUMB,
        { name: "Guyane", url: "/annonces/guyane" },
        {
          name: category.name,
          url: getListingsCategoryPath(category.slug),
        },
      ]}
      faq={buildListingsFaq(`${category.name.toLowerCase()} en Guyane`)}
      exploreLinks={buildListingsCategoryExploreLinks(category)}
    />
  );
}
