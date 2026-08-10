import type { AccessMode, ActivityCategory, Difficulty } from "@prisma/client";

import type { ActivityFeatureProperties } from "@/lib/activities/geojson";
import {
  ACCESS_MODE_VALUES,
  ACCESS_MODES,
  ACTIVITY_CATEGORIES,
  ACTIVITY_CATEGORY_VALUES,
  DIFFICULTIES,
  DIFFICULTY_VALUES,
  getActivityCategoryBySlug,
} from "@/lib/activities/labels";
import { isPracticableNow } from "@/lib/activities/seasons";

/**
 * Filtres de la carte des activités, synchronisés avec l'URL pour que
 * chaque vue soit partageable et indexable :
 *
 *   ?categorie=nature,nautique&commune=kourou&acces=voiture&prix=gratuit
 *   &duree=demi-journee&difficulte=facile&saison=maintenant&lieu=<slug>
 *
 * Slugs français kebab-case sans accents (convention du site), mappés
 * vers les enums Prisma via `labels.ts`. Le filtrage s'applique côté
 * client sur le GeoJSON déjà chargé — zéro requête supplémentaire.
 */

export const PRICE_FILTERS = [
  { slug: "gratuit", label: "Gratuit" },
  { slug: "moins-de-25", label: "Moins de 25 €" },
  { slug: "25-60", label: "25 – 60 €" },
  { slug: "plus-de-60", label: "60 € et plus" },
] as const;
export type PriceFilter = (typeof PRICE_FILTERS)[number]["slug"];

export const DURATION_FILTERS = [
  { slug: "moins-de-2h", label: "Moins de 2h" },
  { slug: "demi-journee", label: "Demi-journée" },
  { slug: "journee", label: "Journée" },
  { slug: "plusieurs-jours", label: "Plusieurs jours" },
] as const;
export type DurationFilter = (typeof DURATION_FILTERS)[number]["slug"];

export type ActivityFilters = {
  categories: ActivityCategory[];
  citySlug: string | null;
  accessModes: AccessMode[];
  price: PriceFilter | null;
  duration: DurationFilter | null;
  difficulty: Difficulty | null;
  /** `saison=maintenant` — ne garder que le praticable aujourd'hui. */
  inSeasonNow: boolean;
};

export const EMPTY_FILTERS: ActivityFilters = {
  categories: [],
  citySlug: null,
  accessModes: [],
  price: null,
  duration: null,
  difficulty: null,
  inSeasonNow: false,
};

// --- Slugs FR <-> enums ------------------------------------------------------

const ACCESS_SLUGS: Record<AccessMode, string> = {
  CAR: "voiture",
  TRACK: "piste",
  FOUR_WHEEL_DRIVE: "4x4",
  PIROGUE: "pirogue",
  BOAT: "bateau",
  PLANE: "avion",
  WALK: "a-pied",
};

const DIFFICULTY_SLUGS: Record<Difficulty, string> = {
  EASY: "facile",
  MODERATE: "moyen",
  HARD: "difficile",
  EXPERT: "expert",
};

export function accessModeSlug(mode: AccessMode): string {
  return ACCESS_SLUGS[mode];
}

export function difficultySlug(difficulty: Difficulty): string {
  return DIFFICULTY_SLUGS[difficulty];
}

function accessModeFromSlug(slug: string): AccessMode | null {
  return (
    ACCESS_MODE_VALUES.find((mode) => ACCESS_SLUGS[mode] === slug) ?? null
  );
}

function difficultyFromSlug(slug: string): Difficulty | null {
  return (
    DIFFICULTY_VALUES.find((value) => DIFFICULTY_SLUGS[value] === slug) ?? null
  );
}

// --- URL <-> filtres ---------------------------------------------------------

export function parseActivityFilters(params: URLSearchParams): ActivityFilters {
  const categories = (params.get("categorie") ?? "")
    .split(",")
    .map((slug) => getActivityCategoryBySlug(slug.trim()))
    .filter((value): value is ActivityCategory => value !== null);

  const accessModes = (params.get("acces") ?? "")
    .split(",")
    .map((slug) => accessModeFromSlug(slug.trim()))
    .filter((value): value is AccessMode => value !== null);

  const priceRaw = params.get("prix");
  const price =
    PRICE_FILTERS.find((option) => option.slug === priceRaw)?.slug ?? null;

  const durationRaw = params.get("duree");
  const duration =
    DURATION_FILTERS.find((option) => option.slug === durationRaw)?.slug ??
    null;

  const difficultyRaw = params.get("difficulte");
  const difficulty = difficultyRaw ? difficultyFromSlug(difficultyRaw) : null;

  return {
    categories: [...new Set(categories)],
    citySlug: params.get("commune")?.trim() || null,
    accessModes: [...new Set(accessModes)],
    price,
    duration,
    difficulty,
    inSeasonNow: params.get("saison") === "maintenant",
  };
}

/** Sérialise les filtres dans `params` (muté), en nettoyant les clés vides. */
export function writeActivityFilters(
  params: URLSearchParams,
  filters: ActivityFilters,
): void {
  const setOrDelete = (key: string, value: string | null) => {
    if (value) params.set(key, value);
    else params.delete(key);
  };

  setOrDelete(
    "categorie",
    filters.categories.length > 0
      ? filters.categories
          .map((category) => ACTIVITY_CATEGORIES[category].slug)
          .join(",")
      : null,
  );
  setOrDelete("commune", filters.citySlug);
  setOrDelete(
    "acces",
    filters.accessModes.length > 0
      ? filters.accessModes.map((mode) => ACCESS_SLUGS[mode]).join(",")
      : null,
  );
  setOrDelete("prix", filters.price);
  setOrDelete("duree", filters.duration);
  setOrDelete(
    "difficulte",
    filters.difficulty ? DIFFICULTY_SLUGS[filters.difficulty] : null,
  );
  setOrDelete("saison", filters.inSeasonNow ? "maintenant" : null);
}

export function countActiveFilters(filters: ActivityFilters): number {
  return (
    filters.categories.length +
    (filters.citySlug ? 1 : 0) +
    filters.accessModes.length +
    (filters.price ? 1 : 0) +
    (filters.duration ? 1 : 0) +
    (filters.difficulty ? 1 : 0) +
    (filters.inSeasonNow ? 1 : 0)
  );
}

// --- Application aux features ------------------------------------------------

function matchesPrice(
  props: ActivityFeatureProperties,
  price: PriceFilter,
): boolean {
  const cents = props.priceMinCents;
  switch (price) {
    case "gratuit":
      return props.isFree;
    case "moins-de-25":
      return props.isFree || (cents !== null && cents < 2500);
    case "25-60":
      return cents !== null && cents >= 2500 && cents <= 6000;
    case "plus-de-60":
      return cents !== null && cents > 6000;
  }
}

function matchesDuration(
  props: ActivityFeatureProperties,
  duration: DurationFilter,
): boolean {
  const minutes = props.durationMinutes;
  if (minutes === null) return false;
  switch (duration) {
    case "moins-de-2h":
      return minutes < 120;
    case "demi-journee":
      return minutes >= 120 && minutes < 300;
    case "journee":
      return minutes >= 300 && minutes < 1440;
    case "plusieurs-jours":
      return minutes >= 1440;
  }
}

export function matchesActivityFilters(
  props: ActivityFeatureProperties,
  filters: ActivityFilters,
  date: Date = new Date(),
): boolean {
  if (
    filters.categories.length > 0 &&
    !filters.categories.includes(props.category)
  ) {
    return false;
  }
  if (filters.citySlug && props.citySlug !== filters.citySlug) return false;
  if (
    filters.accessModes.length > 0 &&
    !filters.accessModes.some((mode) => props.accessModes.includes(mode))
  ) {
    return false;
  }
  if (filters.price && !matchesPrice(props, filters.price)) return false;
  if (filters.duration && !matchesDuration(props, filters.duration)) {
    return false;
  }
  if (filters.difficulty && props.difficulty !== filters.difficulty) {
    return false;
  }
  if (filters.inSeasonNow && !isPracticableNow(props.seasons, date)) {
    return false;
  }
  return true;
}

// Ré-exports pratiques pour les composants de filtre.
export {
  ACCESS_MODE_VALUES,
  ACCESS_MODES,
  ACTIVITY_CATEGORIES,
  ACTIVITY_CATEGORY_VALUES,
  DIFFICULTIES,
  DIFFICULTY_VALUES,
};
