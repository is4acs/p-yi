import { z } from "zod";

import type {
  AccessMode,
  ActivityCategory,
  Difficulty,
  Season,
} from "@prisma/client";
import {
  DAY_KEYS,
  type DayKey,
  type OpeningHours,
} from "@/lib/activities/opening-hours";

/**
 * Validation du formulaire admin création/édition d'activité.
 * Convention repo : Server Actions + zod (pas de react-hook-form) — le
 * client garde des `required` natifs, ce schéma est le contrat serveur.
 */

const CATEGORY_VALUES = [
  "NATURE",
  "WILDLIFE",
  "CULTURE",
  "HERITAGE",
  "SPACE",
  "NAUTICAL",
  "ADVENTURE",
  "GASTRONOMY",
  "WELLNESS",
  "FAMILY",
] as const satisfies readonly ActivityCategory[];

const ACCESS_VALUES = [
  "CAR",
  "TRACK",
  "FOUR_WHEEL_DRIVE",
  "PIROGUE",
  "BOAT",
  "PLANE",
  "WALK",
] as const satisfies readonly AccessMode[];

const DIFFICULTY_VALUES = [
  "EASY",
  "MODERATE",
  "HARD",
  "EXPERT",
] as const satisfies readonly Difficulty[];

const SEASON_VALUES = [
  "MAIN_DRY_SEASON",
  "SHORT_DRY_SEASON",
  "RAINY_SEASON",
  "ALL_YEAR",
] as const satisfies readonly Season[];

/** "" → undefined, pour les champs optionnels des <input>. */
const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalTrimmed = (max: number) =>
  z.preprocess(emptyToUndefined, z.string().trim().max(max).optional());

const optionalUrl = z.preprocess(
  emptyToUndefined,
  z.string().trim().url("URL invalide (https://…)").max(500).optional(),
);

// "08:00-12:00, 14:00-17:30" → [["08:00","12:00"], ["14:00","17:30"]]
const HOURS_RANGE_RE =
  /^([01]\d|2[0-3]):[0-5]\d\s*-\s*([01]\d|2[0-3]):[0-5]\d$/;

const dayHoursField = z
  .string()
  .trim()
  .max(120)
  .transform((value, ctx) => {
    if (!value) return [] as Array<[string, string]>;
    const ranges: Array<[string, string]> = [];
    for (const chunk of value.split(",")) {
      const part = chunk.trim();
      if (!part) continue;
      if (!HOURS_RANGE_RE.test(part)) {
        ctx.addIssue({
          code: "custom",
          message: `Plage horaire invalide « ${part} » — format attendu : 08:00-12:00, 14:00-17:30`,
        });
        return z.NEVER;
      }
      const [start, end] = part.split("-").map((s) => s.trim());
      ranges.push([start, end]);
    }
    return ranges;
  });

export const activityFormSchema = z
  .object({
    id: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
    name: z.string().trim().min(3, "Nom trop court").max(120),
    tagline: z
      .string()
      .trim()
      .min(10, "L'accroche doit faire au moins 10 caractères")
      .max(220, "Accroche trop longue (220 max)"),
    description: z
      .string()
      .trim()
      .min(30, "La description doit faire au moins 30 caractères"),
    category: z.enum(CATEGORY_VALUES),
    citySlug: z.string().trim().min(1, "Choisis une commune"),
    tags: z
      .string()
      .trim()
      .max(300)
      .transform((value) =>
        [
          ...new Set(
            value
              .split(",")
              .map((tag) => tag.trim().toLowerCase())
              .filter(Boolean),
          ),
        ].slice(0, 8),
      ),
    address: optionalTrimmed(200),
    startPoint: optionalTrimmed(200),
    latitude: z.coerce
      .number({ message: "Latitude invalide" })
      .min(1.5, "Latitude hors Guyane")
      .max(6.5, "Latitude hors Guyane"),
    longitude: z.coerce
      .number({ message: "Longitude invalide" })
      .min(-55.5, "Longitude hors Guyane")
      .max(-51, "Longitude hors Guyane"),
    accessModes: z
      .array(z.enum(ACCESS_VALUES))
      .min(1, "Indique au moins un mode d'accès"),
    durationMinutes: z.preprocess(
      emptyToUndefined,
      z.coerce.number().int().min(5).max(20160).optional(),
    ),
    difficulty: z.preprocess(
      emptyToUndefined,
      z.enum(DIFFICULTY_VALUES).optional(),
    ),
    seasons: z.array(z.enum(SEASON_VALUES)),
    accessNote: optionalTrimmed(300),
    priceMin: z.preprocess(
      emptyToUndefined,
      z.coerce.number().min(0).max(100000).optional(),
    ),
    priceMax: z.preprocess(
      emptyToUndefined,
      z.coerce.number().min(0).max(100000).optional(),
    ),
    isFree: z.boolean(),
    bookingRequired: z.boolean(),
    bookingUrl: optionalUrl,
    phone: optionalTrimmed(30),
    whatsapp: optionalTrimmed(30),
    website: optionalUrl,
    instagram: optionalTrimmed(120),
    isFeatured: z.boolean(),
    hours: z.object({
      monday: dayHoursField,
      tuesday: dayHoursField,
      wednesday: dayHoursField,
      thursday: dayHoursField,
      friday: dayHoursField,
      saturday: dayHoursField,
      sunday: dayHoursField,
    }),
    hoursExceptions: optionalTrimmed(300),
    images: z
      .string()
      .transform((value, ctx) => {
        if (!value.trim()) return [];
        try {
          return JSON.parse(value) as unknown;
        } catch {
          ctx.addIssue({ code: "custom", message: "Images illisibles" });
          return z.NEVER;
        }
      })
      .pipe(
        z
          .array(
            z.object({
              url: z.string().url(),
              altText: z
                .string()
                .trim()
                .min(3, "Chaque image doit avoir un texte alternatif")
                .max(200),
            }),
          )
          .max(12, "12 images maximum"),
      ),
  })
  .refine(
    (data) =>
      data.priceMin === undefined ||
      data.priceMax === undefined ||
      data.priceMax >= data.priceMin,
    { message: "Le prix max doit être ≥ au prix min", path: ["priceMax"] },
  );

export type ActivityFormValues = z.infer<typeof activityFormSchema>;

/** Convertit les champs horaires validés en Json `openingHours` (ou null). */
export function buildOpeningHoursJson(
  values: ActivityFormValues,
): OpeningHours | null {
  const hours: OpeningHours = {};
  let hasContent = false;
  for (const day of DAY_KEYS) {
    const ranges = values.hours[day as DayKey];
    if (ranges.length > 0) {
      hours[day as DayKey] = ranges;
      hasContent = true;
    }
  }
  if (values.hoursExceptions) {
    hours.exceptions = [values.hoursExceptions];
    hasContent = true;
  }
  return hasContent ? hours : null;
}

/** Euros (form) → centimes (DB), null si non renseigné. */
export function eurosToCents(value: number | undefined): number | null {
  return value === undefined ? null : Math.round(value * 100);
}
