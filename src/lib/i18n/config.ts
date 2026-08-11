/**
 * Locales du site — importable côté client comme côté serveur.
 * `fr` est la langue source (dictionnaire de référence) ; `pt` couvre le
 * portugais brésilien, `ht` le créole haïtien. Le contenu publié par les
 * utilisateurs (deals, annonces, messages) reste dans sa langue d'origine.
 */
export const LOCALES = ["fr", "pt", "ht"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "fr";

export const LOCALE_COOKIE = "peyi-locale";

/** Libellés natifs, affichés dans le sélecteur de langue. */
export const LOCALE_LABELS: Record<Locale, string> = {
  fr: "Français",
  pt: "Português (BR)",
  ht: "Kreyòl ayisyen",
};

/** Libellés courts pour les pilules du sélecteur. */
export const LOCALE_SHORT: Record<Locale, string> = {
  fr: "FR",
  pt: "PT",
  ht: "KR",
};

/** Valeur de l'attribut <html lang>. */
export const HTML_LANG: Record<Locale, string> = {
  fr: "fr",
  pt: "pt-BR",
  ht: "ht",
};

export function parseLocale(value: string | undefined | null): Locale {
  return (LOCALES as readonly string[]).includes(value ?? "")
    ? (value as Locale)
    : DEFAULT_LOCALE;
}
