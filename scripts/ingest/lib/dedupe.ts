/**
 * Déduplication des candidats de deals.
 *
 * Stratégie en deux passes :
 *   1. Normalisation du titre (lowercase, accents, ponctuation, nombres
 *      arrondis) → `fingerprint` stable entre sources.
 *   2. Si externalUrl présent, on l'utilise comme clé secondaire : deux
 *      sources qui pointent vers la même offre marchand = même deal.
 *
 * La dédup se fait en mémoire sur le batch + en DB via lookup par
 * externalUrl et slug.
 */
import { createHash } from "node:crypto";
import type { DealCandidate } from "../types";

function normalizeTitle(t: string): string {
  return t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\d+([.,]\d+)?\s*(€|euros?|eur)\b/g, "PRICE")
    .replace(/-\s*\d+\s*%/g, "DISCOUNT")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeUrl(u?: string): string | undefined {
  if (!u) return undefined;
  try {
    const url = new URL(u);
    // retire utm_* et tags de tracking
    const trackingKeys: string[] = [];
    url.searchParams.forEach((_, key) => {
      if (
        /^utm_/i.test(key) ||
        ["fbclid", "gclid", "mc_cid", "mc_eid", "ref"].includes(key.toLowerCase())
      ) {
        trackingKeys.push(key);
      }
    });
    for (const k of trackingKeys) url.searchParams.delete(k);
    url.hash = "";
    return url.toString();
  } catch {
    return u;
  }
}

export function computeFingerprint(
  title: string,
  externalUrl?: string,
  price?: number,
): string {
  const titleKey = normalizeTitle(title);
  const urlKey = normalizeUrl(externalUrl) ?? "";
  const priceKey = price != null ? Math.round(price).toString() : "";
  return createHash("sha1")
    .update(`${titleKey}|${urlKey}|${priceKey}`)
    .digest("hex")
    .slice(0, 16);
}

export function dedupeBatch(candidates: DealCandidate[]): DealCandidate[] {
  const seen = new Set<string>();
  const seenUrls = new Set<string>();
  const out: DealCandidate[] = [];

  for (const c of candidates) {
    if (seen.has(c.fingerprint)) continue;
    const normUrl = normalizeUrl(c.externalUrl);
    if (normUrl && seenUrls.has(normUrl)) continue;

    seen.add(c.fingerprint);
    if (normUrl) seenUrls.add(normUrl);
    out.push({ ...c, externalUrl: normUrl });
  }

  return out;
}
