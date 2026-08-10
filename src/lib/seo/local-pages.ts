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
  /**
   * Texte d'ancrage complet et descriptif (« Voir les annonces à Cayenne »).
   * C'est ce que lit Google : on ne le raccourcit JAMAIS. Quand `short` est
   * fourni, il n'est plus affiché mais reste dans le DOM en `sr-only`.
   */
  label: string;
  /**
   * Libellé court réellement affiché (« Cayenne »). Sans lui, une page
   * pilier devient un mur de douze phrases identiques à 90 % — illisible,
   * surtout sur mobile.
   */
  short?: string;
  /** Regroupe les chips sous un intertitre (« Par ville », « Par catégorie »). */
  group?: "city" | "category" | "other";
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

// Pages piliers Activités. Les villes diffèrent volontairement des
// CORE_CITIES : le tourisme se joue à Roura (Kaw, Cacao, crique Gabrielle)
// ou Macouria (zoo), pas à Matoury. Les slugs catégories doivent matcher
// `ACTIVITY_CATEGORIES` (src/lib/activities/labels.ts) — le garde-fou
// noindex (MIN_INDEXABLE_PILLAR_ITEMS) protège les pages encore vides.
export const ACTIVITY_CITY_PILLARS: SeoCity[] = [
  { slug: "cayenne", name: "Cayenne" },
  { slug: "remire-montjoly", name: "Rémire-Montjoly" },
  { slug: "kourou", name: "Kourou" },
  { slug: "roura", name: "Roura" },
  { slug: "macouria", name: "Macouria" },
  { slug: "saint-laurent-du-maroni", name: "Saint-Laurent-du-Maroni" },
];

export const ACTIVITY_CATEGORY_PILLARS: SeoCategory[] = [
  { slug: "nature", name: "Nature" },
  { slug: "faune", name: "Faune" },
  { slug: "culture", name: "Culture" },
  { slug: "patrimoine", name: "Patrimoine" },
  { slug: "spatial", name: "Spatial" },
  { slug: "nautique", name: "Nautique" },
  { slug: "aventure", name: "Aventure" },
  { slug: "gastronomie", name: "Gastronomie" },
  { slug: "famille", name: "Famille" },
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

export function getActivityCityBySlug(slug: string): SeoCity | null {
  return ACTIVITY_CITY_PILLARS.find((city) => city.slug === slug) ?? null;
}

export function getActivityCategoryPillarBySlug(
  slug: string,
): SeoCategory | null {
  return (
    ACTIVITY_CATEGORY_PILLARS.find((category) => category.slug === slug) ??
    null
  );
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

export function getActivitiesCityPath(citySlug: string): string {
  return `/activites/${citySlug}`;
}

export function getActivitiesCategoryPath(categorySlug: string): string {
  return `/activites/${categorySlug}/${GUYANE_SLUG}`;
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
