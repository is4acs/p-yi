import type { DealCandidate, RawItem, Source } from "../types";
import {
  classifyCategory,
  classifyCity,
  classifyMerchant,
  classifyStore,
  extractPrices,
  isLocalInStore,
} from "../lib/classify";
import { computeFingerprint } from "../lib/dedupe";

/**
 * Transforme un item brut scrapé en `DealCandidate` exploitable.
 * - Essaie d'extraire prix + prix d'origine du titre/description.
 * - Classifie catégorie, ville, store, merchant par keywords.
 * - Applique la règle "Guyane + en magasin" ; un item qui ne la
 *   passe pas est rejeté (retourne null).
 *
 * Utilisé par la plupart des sources — à override seulement si la
 * source expose déjà des prix structurés (API JSON, flux produit).
 */
export function normalizeRawItem(
  source: string,
  item: RawItem,
): DealCandidate | null {
  const haystack = `${item.rawTitle} ${item.rawDescription ?? ""}`;
  const prices = extractPrices(haystack);
  if (!prices) return null;

  const categorySlug = classifyCategory(haystack);
  const citySlug = classifyCity(haystack);
  const storeSlug = classifyStore(haystack);
  const merchantSlug = classifyMerchant(haystack, item.externalUrl);

  // Garde fou : doit être en magasin Guyane
  if (
    !isLocalInStore({
      citySlug,
      storeSlug,
      externalUrl: item.externalUrl,
      text: haystack,
    })
  ) {
    return null;
  }

  // Titre : on garde la ponctuation raisonnable, on coupe à 120 chars
  const title = item.rawTitle.trim().slice(0, 120);
  if (title.length < 8) return null;

  return {
    fingerprint: computeFingerprint(title, item.externalUrl, prices.price),
    source,
    sourceId: item.sourceId,
    title,
    description: item.rawDescription?.slice(0, 1000),
    price: prices.price,
    originalPrice: prices.originalPrice,
    isFree: prices.price === 0,
    externalUrl: item.externalUrl,
    coverImageUrl: item.imageUrl,
    categorySlug,
    citySlug,
    storeSlug,
    merchantSlug,
    publishedAt: item.publishedAt ?? new Date(),
  };
}

export type { Source };
