const priceFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

const rtf = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });

export function formatPrice(value: number | string): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "—";
  return priceFormatter.format(n);
}

export function formatRelativeTime(
  input: Date | string | null | undefined,
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

  if (Math.abs(diffMinutes) < 60) return rtf.format(diffMinutes, "minute");
  if (Math.abs(diffHours) < 24) return rtf.format(diffHours, "hour");
  if (Math.abs(diffDays) < 30) return rtf.format(diffDays, "day");
  return rtf.format(Math.round(diffDays / 30), "month");
}
