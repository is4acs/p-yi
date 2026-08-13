import { unstable_cache } from "next/cache";

import { DEFAULT_LOCALE, type Locale } from "./config";

/**
 * Traduction automatique du contenu utilisateur (titres, descriptions,
 * messages) vers la langue de l'interface — pour qu'un vendeur haïtien et
 * un acheteur brésilien se comprennent sans copier-coller dans un
 * traducteur externe.
 *
 * Couche volontairement *pluggable*. Ordre de résolution du fournisseur :
 *
 *  1. `TRANSLATE_API_URL` (+ `TRANSLATE_API_KEY` optionnel) : endpoint
 *     compatible LibreTranslate (POST { q, source: "auto", target }).
 *     Ex. instance auto-hébergée : https://libretranslate.exemple.com/translate
 *  2. `GOOGLE_TRANSLATE_API_KEY` : Google Cloud Translation v2 (couvre le
 *     créole haïtien `ht`, quotas officiels).
 *  3. **Par défaut, sans aucune clé** : l'endpoint web public de Google
 *     Translate (translate.googleapis.com, client=gtx) — gratuit et sans
 *     clé, couvre fr/pt/ht. Non contractuel : si Google le limite, le
 *     garde-fou d'échec fait retomber sur le texte original sans casser
 *     la page. Pour du volume, configurer 1) ou 2). Désactivable avec
 *     `TRANSLATE_DISABLE=1`.
 *
 * Garde-fous :
 *  - interface en français (langue par défaut) → AUCUN appel réseau : le
 *    contenu publié sur Péyi est très majoritairement rédigé en français,
 *    la traduction sert les interfaces pt/ht (vendeur haïtien ↔ acheteur
 *    brésilien). Sans ce court-circuit, chaque rendu fr à froid partait en
 *    dizaines d'appels externes pour re-traduire du français en français ;
 *  - contenu privé (`sensitive: true`, messages directs) → jamais envoyé à
 *    l'endpoint web public sans clé ; il faut un fournisseur contractuel
 *    (TRANSLATE_API_URL ou GOOGLE_TRANSLATE_API_KEY) pour traduire un DM ;
 *  - échec réseau / timeout (4 s) → texte original, jamais d'erreur page,
 *    et disjoncteur de 5 min par instance pour ne pas re-payer le timeout
 *    à chaque texte tant que le fournisseur est en panne ;
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
  return process.env.TRANSLATE_DISABLE !== "1";
}

/**
 * Vrai si un fournisseur contractuel est configuré (instance LibreTranslate
 * auto-hébergée ou Google Cloud avec clé). L'endpoint web public par défaut
 * n'en est pas un — on ne lui confie jamais de contenu privé.
 */
function hasContractualProvider(): boolean {
  return Boolean(
    process.env.TRANSLATE_API_URL || process.env.GOOGLE_TRANSLATE_API_KEY,
  );
}

// --- Disjoncteur d'échec ----------------------------------------------------
// `unstable_cache` ne met pas les échecs en cache (rawTranslate lève) : sans
// garde supplémentaire, un fournisseur en panne ferait re-payer le timeout de
// 4 s à CHAQUE texte de CHAQUE rendu. On retient l'heure du dernier échec
// (par instance serveur) et on coupe les appels pendant 5 min — les pages
// affichent l'original, puis on réessaie une fois la fenêtre écoulée.
const FAILURE_COOLDOWN_MS = 5 * 60 * 1000;
let lastFailureAt = 0;

function providerOnCooldown(): boolean {
  return Date.now() - lastFailureAt < FAILURE_COOLDOWN_MS;
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

/**
 * Endpoint web public de Google Translate (celui du widget web,
 * `client=gtx`) : gratuit, sans clé, couvre fr/pt/ht. POST en
 * form-urlencoded pour ne pas exploser la limite d'URL sur les longues
 * descriptions. Réponse : [[[trad, orig, …], …], null, "langue_source", …].
 */
async function callGoogleWebTranslate(
  text: string,
  target: string,
): Promise<RawResult> {
  const params = new URLSearchParams({
    client: "gtx",
    sl: "auto",
    tl: target,
    dt: "t",
    q: text,
  });
  const res = await fetch(
    "https://translate.googleapis.com/translate_a/single",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
      signal: AbortSignal.timeout(4000),
    },
  );
  if (!res.ok) throw new Error(`Google web translate HTTP ${res.status}`);
  const json = (await res.json()) as unknown;
  if (!Array.isArray(json) || !Array.isArray(json[0])) {
    throw new Error("Google web translate : réponse inattendue");
  }
  const segments = (json[0] as unknown[])
    .map((seg) => (Array.isArray(seg) ? seg[0] : null))
    .filter((part): part is string => typeof part === "string");
  if (segments.length === 0) {
    throw new Error("Google web translate : aucun segment traduit");
  }
  return {
    text: segments.join(""),
    detectedSource: typeof json[2] === "string" ? json[2] : null,
  };
}

/** Lève en cas d'échec — pour que unstable_cache ne mette pas l'échec en cache. */
async function rawTranslate(text: string, target: string): Promise<RawResult> {
  if (process.env.TRANSLATE_API_URL) return callLibreTranslate(text, target);
  if (process.env.GOOGLE_TRANSLATE_API_KEY) {
    return callGoogleTranslate(text, target);
  }
  return callGoogleWebTranslate(text, target);
}

// Le cache est keyé automatiquement par les arguments (texte + cible).
const cachedTranslate = unstable_cache(rawTranslate, ["mt-v1"], {
  revalidate: 60 * 60 * 24 * 30,
  tags: ["mt"],
});

export type TranslateOptions = {
  /**
   * Contenu privé (messages directs). N'est traduit QUE si un fournisseur
   * contractuel est configuré — jamais via l'endpoint web public sans clé.
   */
  sensitive?: boolean;
};

/**
 * Traduit un texte utilisateur vers `target`. Ne lève jamais : en cas de
 * fournisseur absent, d'échec ou de texte déjà dans la bonne langue, le
 * texte original est renvoyé avec `translated: false`.
 */
export async function translateUserText(
  text: string,
  target: Locale,
  options?: TranslateOptions,
): Promise<TranslatedText> {
  const trimmed = text.trim();
  if (!trimmed || !translationEnabled()) {
    return { text, translated: false };
  }
  // Interface dans la langue par défaut (fr) : le contenu est affiché tel
  // quel, sans appel réseau — voir le bloc de doc en tête de fichier.
  if (target === DEFAULT_LOCALE) {
    return { text, translated: false };
  }
  if (options?.sensitive && !hasContractualProvider()) {
    return { text, translated: false };
  }
  if (providerOnCooldown()) {
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
    // Fournisseur injoignable / quota / timeout : on affiche l'original et
    // on arme le disjoncteur pour les prochains textes.
    lastFailureAt = Date.now();
    return { text, translated: false };
  }
}

/** Variante multi-textes (title + description d'une fiche, fil de messages). */
export async function translateUserTexts(
  texts: string[],
  target: Locale,
  options?: TranslateOptions,
): Promise<TranslatedText[]> {
  return Promise.all(
    texts.map((text) => translateUserText(text, target, options)),
  );
}
