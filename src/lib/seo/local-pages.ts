export type SeoCity = {
  slug: string;
  name: string;
};

export type SeoCategory = {
  slug: string;
  name: string;
};

export type SeoStore = {
  slug: string;
  name: string;
  citySlug: string;
};

export type ExploreLink = {
  href: string;
  label: string;
  description?: string;
};

export type FaqItem = {
  question: string;
  answer: string;
};

export const GUYANE_SLUG = "guyane";

export const CORE_CITIES: SeoCity[] = [
  { slug: "cayenne", name: "Cayenne" },
  { slug: "matoury", name: "Matoury" },
  { slug: "kourou", name: "Kourou" },
  { slug: "remire-montjoly", name: "Rémire-Montjoly" },
  { slug: "saint-laurent-du-maroni", name: "Saint-Laurent-du-Maroni" },
];

export const DEAL_CATEGORY_PILLARS: SeoCategory[] = [
  { slug: "supermarche-alimentation", name: "Supermarché & Alimentation" },
  { slug: "tech-multimedia", name: "Tech & Multimédia" },
  { slug: "maison-electromenager", name: "Maison & Électroménager" },
  { slug: "enfants-bebe", name: "Enfants & Bébé" },
];

export const LISTING_CATEGORY_PILLARS: SeoCategory[] = [
  { slug: "voitures", name: "Voitures" },
  { slug: "motos-scooters", name: "Motos & Scooters" },
  { slug: "immobilier", name: "Immobilier" },
  { slug: "location-appartement", name: "Location appartement" },
  { slug: "emploi-services", name: "Emploi & Services" },
  { slug: "maison-mobilier", name: "Maison & Mobilier" },
  { slug: "multimedia-tech", name: "Multimédia & Tech" },
];

export const STORE_PILLARS: SeoStore[] = [
  { slug: "hyper-u-cayenne", name: "Hyper U Cayenne", citySlug: "cayenne" },
  {
    slug: "carrefour-matoury",
    name: "Carrefour Matoury",
    citySlug: "matoury",
  },
  { slug: "fnac-cayenne", name: "Fnac Cayenne", citySlug: "cayenne" },
  { slug: "darty-matoury", name: "Darty Matoury", citySlug: "matoury" },
];

export const MIN_INDEXABLE_PILLAR_ITEMS = 2;
export const MIN_INDEXABLE_STORE_DEALS = 3;

export const GUIDE_SLUGS = [
  "bons-plans-guyane",
  "petites-annonces-guyane",
  "vendre-sa-voiture-en-guyane",
  "trouver-un-appartement-en-guyane",
] as const;

export type GuideSlug = (typeof GUIDE_SLUGS)[number];

export function getCityBySlug(slug: string): SeoCity | null {
  return CORE_CITIES.find((city) => city.slug === slug) ?? null;
}

export function getDealCategoryBySlug(slug: string): SeoCategory | null {
  return DEAL_CATEGORY_PILLARS.find((category) => category.slug === slug) ?? null;
}

export function getListingCategoryBySlug(slug: string): SeoCategory | null {
  return (
    LISTING_CATEGORY_PILLARS.find((category) => category.slug === slug) ?? null
  );
}

export function getStoreBySlug(slug: string): SeoStore | null {
  return STORE_PILLARS.find((store) => store.slug === slug) ?? null;
}

export function getDealsCityPath(citySlug: string): string {
  return `/bons-plans/${citySlug}`;
}

export function getListingsCityPath(citySlug: string): string {
  return `/annonces/${citySlug}`;
}

export function getDealsCategoryPath(categorySlug: string): string {
  return `/bons-plans/${categorySlug}/${GUYANE_SLUG}`;
}

export function getListingsCategoryPath(categorySlug: string): string {
  return `/annonces/${categorySlug}/${GUYANE_SLUG}`;
}

export function getStorePath(storeSlug: string): string {
  return `/magasins/${storeSlug}`;
}

export function getDealsFacetCanonicalPath(input: {
  categorySlug: string | null;
  citySlug: string | null;
}): string | null {
  const { categorySlug, citySlug } = input;
  if (categorySlug && citySlug) return null;

  if (citySlug && getCityBySlug(citySlug)) {
    return getDealsCityPath(citySlug);
  }

  if (categorySlug && getDealCategoryBySlug(categorySlug)) {
    return getDealsCategoryPath(categorySlug);
  }

  return null;
}

export function getListingsFacetCanonicalPath(input: {
  categorySlug: string | null;
  citySlug: string | null;
}): string | null {
  const { categorySlug, citySlug } = input;
  if (categorySlug && citySlug) return null;

  if (citySlug && getCityBySlug(citySlug)) {
    return getListingsCityPath(citySlug);
  }

  if (categorySlug && getListingCategoryBySlug(categorySlug)) {
    return getListingsCategoryPath(categorySlug);
  }

  return null;
}

export function isGuideSlug(slug: string): slug is GuideSlug {
  return GUIDE_SLUGS.includes(slug as GuideSlug);
}
