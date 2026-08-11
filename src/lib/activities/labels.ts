import type {
  AccessMode,
  ActivityCategory,
  ActivityStatus,
  Difficulty,
  Season,
} from "@prisma/client";

import { formatPrice } from "@/lib/format";
import type { Locale } from "@/lib/i18n/config";

/**
 * Libellés français + métadonnées d'affichage des enums Activité.
 *
 * Le schéma Prisma suit la convention anglaise du reste de la base
 * (`ActivityCategory.NATURE`…) ; tout ce qui est montré à l'utilisateur ou
 * exposé dans une URL passe par ce module. Fichier importable côté client
 * ET serveur : les enums de `@prisma/client` sont disponibles dans le
 * bundle navigateur (index-browser), et tout le reste est de la donnée pure.
 */

export type ActivityCategoryMeta = {
  label: string;
  /** Slug URL français, kebab-case sans accents (`?categorie=bien-etre`). */
  slug: string;
  emoji: string;
  /**
   * Couleur du marqueur carte. Un hex est nécessaire (les layers MapLibre
   * ne consomment pas de classes Tailwind) — même précédent que
   * `Category.color` côté bons plans/annonces.
   */
  color: string;
};

export const ACTIVITY_CATEGORIES: Record<ActivityCategory, ActivityCategoryMeta> = {
  NATURE: { label: "Nature", slug: "nature", emoji: "🌿", color: "#43961F" },
  WILDLIFE: { label: "Faune", slug: "faune", emoji: "🐢", color: "#F59E0B" },
  CULTURE: { label: "Culture", slug: "culture", emoji: "🪶", color: "#8B5CF6" },
  HERITAGE: { label: "Patrimoine", slug: "patrimoine", emoji: "🏛️", color: "#A16207" },
  SPACE: { label: "Spatial", slug: "spatial", emoji: "🚀", color: "#3B82F6" },
  NAUTICAL: { label: "Nautique", slug: "nautique", emoji: "🛶", color: "#06B6D4" },
  ADVENTURE: { label: "Aventure", slug: "aventure", emoji: "🧗", color: "#EF4444" },
  GASTRONOMY: { label: "Gastronomie", slug: "gastronomie", emoji: "🍲", color: "#EC4899" },
  WELLNESS: { label: "Bien-être", slug: "bien-etre", emoji: "🌸", color: "#14B8A6" },
  FAMILY: { label: "Famille", slug: "famille", emoji: "👨‍👩‍👧", color: "#84CC16" },
};

export const ACTIVITY_CATEGORY_VALUES = Object.keys(
  ACTIVITY_CATEGORIES,
) as ActivityCategory[];

export function getActivityCategoryBySlug(
  slug: string,
): ActivityCategory | null {
  const entry = ACTIVITY_CATEGORY_VALUES.find(
    (value) => ACTIVITY_CATEGORIES[value].slug === slug,
  );
  return entry ?? null;
}

export type AccessModeMeta = {
  label: string;
  /** Description courte pour le bandeau accès ("route goudronnée"…). */
  description: string;
  emoji: string;
};

export const ACCESS_MODES: Record<AccessMode, AccessModeMeta> = {
  CAR: { label: "Route", description: "route goudronnée", emoji: "🚗" },
  TRACK: { label: "Piste", description: "piste carrossable", emoji: "🛻" },
  FOUR_WHEEL_DRIVE: { label: "4x4", description: "4x4 obligatoire", emoji: "🚙" },
  PIROGUE: { label: "Pirogue", description: "accès en pirogue", emoji: "🛶" },
  BOAT: { label: "Bateau", description: "navette maritime", emoji: "🚤" },
  PLANE: { label: "Avion", description: "accès aérien uniquement", emoji: "🛩️" },
  WALK: { label: "À pied", description: "marche d'approche", emoji: "🥾" },
};

export const ACCESS_MODE_VALUES = Object.keys(ACCESS_MODES) as AccessMode[];

export const DIFFICULTIES: Record<Difficulty, { label: string }> = {
  EASY: { label: "Facile" },
  MODERATE: { label: "Moyen" },
  HARD: { label: "Difficile" },
  EXPERT: { label: "Expert" },
};

export const DIFFICULTY_VALUES = Object.keys(DIFFICULTIES) as Difficulty[];

export const SEASONS: Record<Season, { label: string; short: string }> = {
  MAIN_DRY_SEASON: {
    label: "Grande saison sèche (juil.–nov.)",
    short: "Saison sèche",
  },
  SHORT_DRY_SEASON: {
    label: "Petit été de mars",
    short: "Petit été de mars",
  },
  RAINY_SEASON: {
    label: "Saison des pluies (déc.–juin)",
    short: "Saison des pluies",
  },
  ALL_YEAR: { label: "Toute l'année", short: "Toute l'année" },
};

export const ACTIVITY_STATUSES: Record<ActivityStatus, { label: string }> = {
  DRAFT: { label: "Brouillon" },
  PENDING_REVIEW: { label: "En attente" },
  PUBLISHED: { label: "Publié" },
  HIDDEN: { label: "Masqué" },
};

/** Mots localisés des formats prix/durée (« Gratuit », « jour »…). */
const PRICE_WORDS: Record<Locale, { free: string; unknown: string }> = {
  fr: { free: "Gratuit", unknown: "Tarif non communiqué" },
  pt: { free: "Grátis", unknown: "Preço não informado" },
  ht: { free: "Gratis", unknown: "Pri a pa disponib" },
};

const DAY_WORDS: Record<Locale, { one: string; many: string }> = {
  fr: { one: "1 jour", many: "jours" },
  pt: { one: "1 dia", many: "dias" },
  ht: { one: "1 jou", many: "jou" },
};

/**
 * Prix affiché d'une activité : "Gratuit", "45 €", "45 € – 69 €" ou
 * "Tarif non communiqué" (null). Montants stockés en centimes.
 */
export function formatActivityPrice(
  input: {
    isFree: boolean;
    priceMinCents: number | null;
    priceMaxCents: number | null;
  },
  locale: Locale = "fr",
): string {
  const words = PRICE_WORDS[locale];
  if (input.isFree) return words.free;
  if (input.priceMinCents == null) return words.unknown;
  const min = formatPrice(input.priceMinCents / 100);
  if (input.priceMaxCents == null || input.priceMaxCents === input.priceMinCents) {
    return min;
  }
  return `${min} – ${formatPrice(input.priceMaxCents / 100)}`;
}

/** Durée lisible : 90 → "1h30", 480 → "8h", 2880 → "2 jours". */
export function formatDuration(
  minutes: number | null,
  locale: Locale = "fr",
): string | null {
  if (minutes == null || minutes <= 0) return null;
  if (minutes >= 1440) {
    const days = Math.round(minutes / 1440);
    const words = DAY_WORDS[locale];
    return days <= 1 ? words.one : `${days} ${words.many}`;
  }
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}
