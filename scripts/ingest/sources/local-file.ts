/**
 * Source : fichier JSON local (`data/local-deals.json`).
 *
 * Utile pour :
 *   - seed initial de deals vérifiés à la main,
 *   - copier-coller depuis des catalogues PDF ou Facebook des enseignes
 *     Guyane (Carrefour Matoury, Hyper U Cayenne, Géant Cayenne, Darty, Fnac,
 *     Leader Price, Weldom...),
 *   - deals exclusifs que le scraping RSS ne capture pas.
 *
 * Format : tableau d'objets. Seuls `title`, `price`, `categorySlug`
 * sont requis ; le reste est optionnel. Le fingerprint est calculé
 * automatiquement, donc ré-exécuter n'importera pas deux fois.
 */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { DealCandidate, Source } from "../types";
import { computeFingerprint } from "../lib/dedupe";
import {
  classifyCity,
  classifyMerchant,
  classifyStore,
  isLocalInStore,
} from "../lib/classify";

type LocalDealRaw = {
  title: string;
  description?: string;
  price: number;
  originalPrice?: number;
  isFree?: boolean;
  categorySlug: string;
  citySlug?: string;
  storeSlug?: string;
  merchantSlug?: string;
  externalUrl?: string;
  coverImageUrl?: string;
  /** ISO string, sinon maintenant */
  publishedAt?: string;
  expiresAt?: string;
};

export class LocalFileSource implements Source {
  readonly name = "local-file";
  private readonly path: string;

  constructor(path = resolve(process.cwd(), "data/local-deals.json")) {
    this.path = path;
  }

  async fetch(limit: number): Promise<DealCandidate[]> {
    let raw: string;
    try {
      raw = await readFile(this.path, "utf-8");
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        console.warn(`  ⚠️  ${this.path} absent, aucun deal local.`);
        return [];
      }
      throw err;
    }

    const data = JSON.parse(raw) as LocalDealRaw[];
    const candidates: DealCandidate[] = [];

    for (const d of data.slice(0, limit)) {
      const title = d.title.trim().slice(0, 120);
      if (title.length < 8) continue;

      const haystack = `${title} ${d.description ?? ""}`;
      const citySlug = d.citySlug ?? classifyCity(haystack);
      const storeSlug = d.storeSlug ?? classifyStore(haystack);
      const merchantSlug =
        d.merchantSlug ?? classifyMerchant(haystack, d.externalUrl);

      if (
        !isLocalInStore({
          citySlug,
          storeSlug,
          externalUrl: d.externalUrl,
          text: haystack,
        })
      ) {
        console.warn(`  ⚠️  local-file skip "${title.slice(0, 60)}" — pas en magasin Guyane`);
        continue;
      }

      candidates.push({
        fingerprint: computeFingerprint(title, d.externalUrl, d.price),
        source: this.name,
        sourceId: d.externalUrl ?? `${title}-${d.price}`,
        title,
        description: d.description?.slice(0, 1000),
        price: d.price,
        originalPrice: d.originalPrice,
        isFree: d.isFree ?? d.price === 0,
        externalUrl: d.externalUrl,
        coverImageUrl: d.coverImageUrl,
        categorySlug: d.categorySlug,
        citySlug,
        storeSlug,
        merchantSlug,
        publishedAt: d.publishedAt ? new Date(d.publishedAt) : new Date(),
        expiresAt: d.expiresAt ? new Date(d.expiresAt) : undefined,
      });
    }

    return candidates;
  }
}
