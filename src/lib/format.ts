import type { Locale } from "@/lib/i18n/config";

const priceFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

/**
 * Formateurs de temps relatif par langue de l'interface. `ht` (créole
 * haïtien) n'est pas couvert par ICU : on le gère à la main plus bas
 * plutôt que de laisser Intl retomber silencieusement sur l'anglais.
 */
const RTF: Record<Exclude<Locale, "ht">, Intl.RelativeTimeFormat> = {
  fr: new Intl.RelativeTimeFormat("fr", { numeric: "auto" }),
  pt: new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" }),
};

const HT_UNITS: Record<"minute" | "hour" | "day" | "month", string> = {
  minute: "min",
  hour: "è",
  day: "jou",
  month: "mwa",
};

function formatRelativeHt(
  value: number,
  unit: "minute" | "hour" | "day" | "month",
): string {
  const n = Math.abs(value);
  const u = HT_UNITS[unit];
  // Passé : « sa gen 3 jou » ; futur : « nan 3 jou ».
  return value <= 0 ? `sa gen ${n} ${u}` : `nan ${n} ${u}`;
}

export function formatPrice(value: number | string): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "—";
  return priceFormatter.format(n);
}

export function formatRelativeTime(
  input: Date | string | null | undefined,
  locale: Locale = "fr",
): string {
  // Défense en profondeur : si `input` est null/undefined ou donne une
  // Date invalide, on renvoie une string vide au lieu de crasher.
  // `Intl.RelativeTimeFormat.format(NaN)` lève un `RangeError` qui
  // remonterait sinon au boundary global et afficherait "Quelque
  // chose s'est mal passé" sur toute la page.
  if (input == null) return "";
  const date = typeof input === "string" ? new Date(input) : input;
  const ms = date.getTime();
  if (!Number.isFinite(ms)) return "";

  const diffMs = ms - Date.now();
  const diffMinutes = Math.round(diffMs / 60_000);
  const diffHours = Math.round(diffMs / 3_600_000);
  const diffDays = Math.round(diffMs / 86_400_000);

  let value: number;
  let unit: "minute" | "hour" | "day" | "month";
  if (Math.abs(diffMinutes) < 60) {
    value = diffMinutes;
    unit = "minute";
  } else if (Math.abs(diffHours) < 24) {
    value = diffHours;
    unit = "hour";
  } else if (Math.abs(diffDays) < 30) {
    value = diffDays;
    unit = "day";
  } else {
    value = Math.round(diffDays / 30);
    unit = "month";
  }

  if (locale === "ht") return formatRelativeHt(value, unit);
  return RTF[locale].format(value, unit);
}
