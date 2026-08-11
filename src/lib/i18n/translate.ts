import { unstable_cache } from "next/cache";

import type { Locale } from "./config";

/**
 * Traduction automatique du contenu utilisateur (titres, descriptions,
 * messages) vers la langue de l'interface — pour qu'un vendeur haïtien et
 * un acheteur brésilien se comprennent sans copier-coller dans un
 * traducteur externe.
 *
 * Couche volontairement *pluggable* : le site fonctionne sans aucun
 * fournisseur configuré (les textes passent alors tels quels). Deux
 * back-ends supportés, choisis via variables d'environnement :
 *
 *  - `TRANSLATE_API_URL` (+ `TRANSLATE_API_KEY` optionnel) : endpoint
 *    compatible LibreTranslate (POST { q, source: "auto", target }).
 *    Ex. instance auto-hébergée : https://libretranslate.exemple.com/translate
 *  - `GOOGLE_TRANSLATE_API_KEY` : Google Cloud Translation v2 (seul grand
 *    fournisseur à couvrir le créole haïtien `ht`).
 *
 * Garde-fous :
 *  - échec réseau / timeout (4 s) → texte original, jamais d'erreur page ;
 *  - langue détectée == langue cible → texte original (translated: false) ;
 *  - résultats mis en cache serveur 30 jours (clé = texte + cible), les
 *    échecs ne sont PAS mis en cache.
 */

export type TranslatedText = {
  text: string;
  /** true si le texte affiché diffère de l'original (traduction réelle). */
  translated: boolean;
};

/** Codes langue côté fournisseurs (identiques pour Libre/Google ici). */
const PROVIDER_LANG: Record<Locale, string> = {
  fr: "fr",
  pt: "pt",
  ht: "ht",
};

export function translationEnabled(): boolean {
  return Boolean(
    process.env.TRANSLATE_API_URL || process.env.GOOGLE_TRANSLATE_API_KEY,
  );
}

type RawResult = {
  text: string;
  detectedSource: string | null;
};

async function callLibreTranslate(
  text: string,
  target: string,
): Promise<RawResult> {
  const url = process.env.TRANSLATE_API_URL as string;
  const body: Record<string, string> = {
    q: text,
    source: "auto",
    target,
    format: "text",
  };
  if (process.env.TRANSLATE_API_KEY) {
    body.api_key = process.env.TRANSLATE_API_KEY;
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(4000),
  });
  if (!res.ok) throw new Error(`LibreTranslate HTTP ${res.status}`);
  const json = (await res.json()) as {
    translatedText?: string;
    detectedLanguage?: { language?: string };
  };
  if (typeof json.translatedText !== "string") {
    throw new Error("LibreTranslate: réponse sans translatedText");
  }
  return {
    text: json.translatedText,
    detectedSource: json.detectedLanguage?.language ?? null,
  };
}

async function callGoogleTranslate(
  text: string,
  target: string,
): Promise<RawResult> {
  const key = process.env.GOOGLE_TRANSLATE_API_KEY as string;
  const url = `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q: text, target, format: "text" }),
    signal: AbortSignal.timeout(4000),
  });
  if (!res.ok) throw new Error(`Google Translate HTTP ${res.status}`);
  const json = (await res.json()) as {
    data?: {
      translations?: Array<{
        translatedText?: string;
        detectedSourceLanguage?: string;
      }>;
    };
  };
  const first = json.data?.translations?.[0];
  if (!first || typeof first.translatedText !== "string") {
    throw new Error("Google Translate: réponse sans translatedText");
  }
  return {
    text: first.translatedText,
    detectedSource: first.detectedSourceLanguage ?? null,
  };
}

/** Lève en cas d'échec — pour que unstable_cache ne mette pas l'échec en cache. */
async function rawTranslate(text: string, target: string): Promise<RawResult> {
  if (process.env.TRANSLATE_API_URL) return callLibreTranslate(text, target);
  return callGoogleTranslate(text, target);
}

// Le cache est keyé automatiquement par les arguments (texte + cible).
const cachedTranslate = unstable_cache(rawTranslate, ["mt-v1"], {
  revalidate: 60 * 60 * 24 * 30,
  tags: ["mt"],
});

/**
 * Traduit un texte utilisateur vers `target`. Ne lève jamais : en cas de
 * fournisseur absent, d'échec ou de texte déjà dans la bonne langue, le
 * texte original est renvoyé avec `translated: false`.
 */
export async function translateUserText(
  text: string,
  target: Locale,
): Promise<TranslatedText> {
  const trimmed = text.trim();
  if (!trimmed || !translationEnabled()) {
    return { text, translated: false };
  }
  try {
    const result = await cachedTranslate(trimmed, PROVIDER_LANG[target]);
    const sameLang =
      result.detectedSource !== null &&
      result.detectedSource.toLowerCase().startsWith(PROVIDER_LANG[target]);
    if (sameLang || result.text.trim() === trimmed) {
      return { text, translated: false };
    }
    return { text: result.text, translated: true };
  } catch {
    // Fournisseur injoignable / quota / timeout : on affiche l'original.
    return { text, translated: false };
  }
}

/** Variante multi-textes (title + description d'une fiche, fil de messages). */
export async function translateUserTexts(
  texts: string[],
  target: Locale,
): Promise<TranslatedText[]> {
  return Promise.all(texts.map((text) => translateUserText(text, target)));
}
