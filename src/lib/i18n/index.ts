import { cookies } from "next/headers";

import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  parseLocale,
  type Locale,
} from "./config";
import { fr, type Messages } from "./dictionaries/fr";
import { pt } from "./dictionaries/pt";
import { ht } from "./dictionaries/ht";

export type { Locale, Messages };
export { DEFAULT_LOCALE };

const DICTIONARIES: Record<Locale, Messages> = { fr, pt, ht };

/** Locale de la requête courante (cookie `peyi-locale`, défaut fr). */
export async function getLocale(): Promise<Locale> {
  try {
    const store = await cookies();
    return parseLocale(store.get(LOCALE_COOKIE)?.value);
  } catch {
    // Hors contexte requête (build statique) : français.
    return DEFAULT_LOCALE;
  }
}

export function getDictionary(locale: Locale): Messages {
  return DICTIONARIES[locale] ?? fr;
}

/** Raccourci serveur : dictionnaire de la requête courante. */
export async function getMessages(): Promise<Messages> {
  return getDictionary(await getLocale());
}

export { tFormat } from "./tformat";
