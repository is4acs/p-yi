/**
 * Source : scraping HTML des sites de magasins Guyane.
 *
 * Configuration : `data/retailers.json` — un tableau d'objets décrivant
 * chaque site à scraper. Chaque entrée fournit :
 *
 *   {
 *     "name": "Carrefour Guyane — Promos",
 *     "pageUrl": "https://www.carrefour-guyane.com/bons-plans",
 *     "defaultCitySlug": "matoury",       // ville à attribuer par défaut
 *     "defaultStoreSlug": "carrefour-matoury",  // store Péyi
 *     "itemRegex": "<article class=\"product\">([\\s\\S]*?)</article>",
 *     "titleRegex": "<h2>([^<]+)</h2>",
 *     "priceRegex": "(\\d+[.,]\\d{2})\\s*€",
 *     "originalPriceRegex": "<del>(\\d+[.,]\\d{2})\\s*€"   // optionnel
 *   }
 *
 * Les sélecteurs sont des regex — pas de CSS parser pour rester sans
 * dépendance. Si un site change sa structure, ajuste le regex. C'est
 * volontairement fragile : un scraper stable nécessite du monitoring
 * de toute façon.
 *
 * La règle Guyane-in-store s'applique automatiquement via
 * `normalizeRawItem` : si le retailer n'a pas de store/city Guyane
 * configuré et que les titres n'en mentionnent pas, les items sont
 * rejetés — safe par construction.
 */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { DealCandidate, Source } from "../types";
import { fetchText } from "../lib/fetch";
import { computeFingerprint } from "../lib/dedupe";
import {
  classifyCategory,
  classifyCity,
  classifyMerchant,
  classifyStore,
  extractPrices,
  isLocalInStore,
} from "../lib/classify";

type RetailerConfig = {
  name: string;
  pageUrl: string;
  defaultCitySlug?: string;
  defaultStoreSlug?: string;
  itemRegex: string;
  titleRegex: string;
  priceRegex: string;
  originalPriceRegex?: string;
};

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&eacute;/g, "é")
    .replace(/&egrave;/g, "è")
    .replace(/\s+/g, " ")
    .trim();
}

function parsePrice(raw: string): number | undefined {
  const m = raw.match(/(\d+[.,]\d{1,2})/);
  if (!m) return undefined;
  const n = parseFloat(m[1].replace(",", "."));
  return isFinite(n) && n > 0 ? n : undefined;
}

export class RetailerHtmlSource implements Source {
  readonly name = "retailer-html";
  private readonly configPath: string;

  constructor(
    configPath = resolve(process.cwd(), "data/retailers.json"),
  ) {
    this.configPath = configPath;
  }

  async fetch(limit: number): Promise<DealCandidate[]> {
    let configs: RetailerConfig[];
    try {
      configs = JSON.parse(await readFile(this.configPath, "utf-8"));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        console.warn(
          `  ⚠️  ${this.configPath} absent, scraping retailer désactivé.`,
        );
        return [];
      }
      throw err;
    }

    const candidates: DealCandidate[] = [];
    const perRetailer = Math.max(5, Math.floor(limit / configs.length));

    for (const cfg of configs) {
      try {
        const html = await fetchText(cfg.pageUrl);
        const items = this.extractItems(cfg, html, perRetailer);
        candidates.push(...items);
        if (candidates.length >= limit) break;
      } catch (err) {
        console.warn(
          `  ⚠️  retailer-html ${cfg.name} : ${(err as Error).message}`,
        );
      }
    }

    return candidates.slice(0, limit);
  }

  private extractItems(
    cfg: RetailerConfig,
    html: string,
    limit: number,
  ): DealCandidate[] {
    const out: DealCandidate[] = [];
    const itemRe = new RegExp(cfg.itemRegex, "gi");
    const titleRe = new RegExp(cfg.titleRegex, "i");
    const priceRe = new RegExp(cfg.priceRegex, "i");
    const origPriceRe = cfg.originalPriceRegex
      ? new RegExp(cfg.originalPriceRegex, "i")
      : null;

    let match: RegExpExecArray | null;
    while ((match = itemRe.exec(html)) !== null && out.length < limit) {
      const block = match[1] ?? match[0];

      const titleMatch = block.match(titleRe);
      const priceMatch = block.match(priceRe);
      if (!titleMatch || !priceMatch) continue;

      const title = stripHtml(titleMatch[1] ?? "").slice(0, 120);
      const price = parsePrice(priceMatch[1] ?? priceMatch[0]);
      if (!title || title.length < 8 || !price) continue;

      const originalPrice = origPriceRe
        ? parsePrice(block.match(origPriceRe)?.[1] ?? "")
        : undefined;

      const haystack = `${title} ${cfg.name}`;
      const citySlug = cfg.defaultCitySlug ?? classifyCity(haystack);
      const storeSlug = cfg.defaultStoreSlug ?? classifyStore(haystack);
      const merchantSlug = classifyMerchant(haystack, cfg.pageUrl);
      const categorySlug = classifyCategory(haystack);

      if (
        !isLocalInStore({
          citySlug,
          storeSlug,
          externalUrl: cfg.pageUrl,
          text: haystack,
        })
      ) {
        continue;
      }

      const autoPrices = extractPrices(title);
      const finalPrice = price || autoPrices?.price || 0;
      const finalOrig =
        originalPrice ??
        autoPrices?.originalPrice ??
        undefined;

      out.push({
        fingerprint: computeFingerprint(title, cfg.pageUrl, finalPrice),
        source: this.name,
        sourceId: `${cfg.name}:${title}:${finalPrice}`,
        title,
        description: `Promo ${cfg.name} — ${title}`,
        price: finalPrice,
        originalPrice: finalOrig && finalOrig > finalPrice ? finalOrig : undefined,
        externalUrl: cfg.pageUrl,
        categorySlug,
        citySlug,
        storeSlug,
        merchantSlug,
        publishedAt: new Date(),
      });
    }

    return out;
  }
}
