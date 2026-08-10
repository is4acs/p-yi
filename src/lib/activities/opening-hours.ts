import { z } from "zod";

/**
 * Horaires d'une activité (`Activity.openingHours`, colonne Json).
 *
 * Format stocké :
 *   { monday: [["08:00","12:00"], ["14:00","17:00"]], …, exceptions: ["…"] }
 *
 * Clés anglaises comme `Store.openingHours` ; plages en "HH:MM" 24h.
 * `null` / absent = site en accès libre (pas de notion d'ouverture).
 * Les calculs « ouvert maintenant » se font en heure de Guyane
 * (America/Cayenne) — le serveur tourne en UTC.
 */

const GUYANE_TZ = "America/Cayenne";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const timeRangeSchema = z.tuple([
  z.string().regex(TIME_RE, "Heure attendue au format HH:MM"),
  z.string().regex(TIME_RE, "Heure attendue au format HH:MM"),
]);

export const DAY_KEYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type DayKey = (typeof DAY_KEYS)[number];

export const DAY_LABELS: Record<DayKey, string> = {
  monday: "Lundi",
  tuesday: "Mardi",
  wednesday: "Mercredi",
  thursday: "Jeudi",
  friday: "Vendredi",
  saturday: "Samedi",
  sunday: "Dimanche",
};

export const openingHoursSchema = z
  .object({
    monday: z.array(timeRangeSchema),
    tuesday: z.array(timeRangeSchema),
    wednesday: z.array(timeRangeSchema),
    thursday: z.array(timeRangeSchema),
    friday: z.array(timeRangeSchema),
    saturday: z.array(timeRangeSchema),
    sunday: z.array(timeRangeSchema),
    /** Mentions libres ("Fermé les jours fériés", "Dernière entrée 16h30"…). */
    exceptions: z.array(z.string()),
  })
  .partial();

export type OpeningHours = z.infer<typeof openingHoursSchema>;
export type TimeRange = z.infer<typeof timeRangeSchema>;

/** Parse tolérant : Json inconnu → OpeningHours ou null si invalide/absent. */
export function parseOpeningHours(value: unknown): OpeningHours | null {
  if (value == null) return null;
  const parsed = openingHoursSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function dayKeyInGuyane(date: Date): DayKey {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: GUYANE_TZ,
    weekday: "long",
  })
    .format(date)
    .toLowerCase();
  return (DAY_KEYS as readonly string[]).includes(weekday)
    ? (weekday as DayKey)
    : "monday";
}

function timeInGuyane(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: GUYANE_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

/** Plages du jour courant (heure de Guyane). [] = fermé aujourd'hui. */
export function todayRanges(
  hours: OpeningHours,
  date: Date = new Date(),
): TimeRange[] {
  return hours[dayKeyInGuyane(date)] ?? [];
}

/**
 * Ouvert à l'instant `date` ? Comparaison lexicographique de "HH:MM" —
 * suffisant tant qu'on ne gère pas d'horaires passant minuit (aucun cas
 * réel côté activités touristiques).
 */
export function isOpenAt(hours: OpeningHours, date: Date = new Date()): boolean {
  const now = timeInGuyane(date);
  return todayRanges(hours, date).some(([start, end]) => start <= now && now < end);
}
