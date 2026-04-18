/**
 * Source : blada.com — portail d'actu Guyane.
 *
 * Pourquoi : site WordPress public, contenu 100% Guyane, rubrique
 * "Bons plans" + nombreux articles évoquant des promos locales.
 *
 * Stratégie : on consomme le flux RSS principal et on filtre les items
 * dont le titre/description évoquent une promo (présence d'un prix en €
 * OU mot-clé "bon plan/promo/offre/réduction/gratuit"). L'extraction de
 * prix est faite par `normalizeRawItem`.
 *
 * URL flux : configurable via env `PEYI_INGEST_BLADA_RSS`, défaut
 * https://www.blada.com/feed/ (WordPress par défaut). Vérifie sur ta
 * machine que ce flux retourne bien du XML — sinon ajuste l'URL.
 */
import type { DealCandidate, Source } from "../types";
import { fetchText } from "../lib/fetch";
import { parseRss } from "../lib/parse-rss";
import { normalizeRawItem } from "./base";

const DEFAULT_FEED = "https://www.blada.com/feed/";
const DEAL_KEYWORDS =
  /\b(promo|bon\s*plan|offre|r[eé]duction|solde|gratuit|-\s*\d+\s*%|\d+\s*€|euros?)/i;

export class BladaRssSource implements Source {
  readonly name = "blada-rss";
  private readonly feedUrl: string;

  constructor(feedUrl = process.env.PEYI_INGEST_BLADA_RSS ?? DEFAULT_FEED) {
    this.feedUrl = feedUrl;
  }

  async fetch(limit: number): Promise<DealCandidate[]> {
    const xml = await fetchText(this.feedUrl);
    const items = parseRss(xml);

    const candidates: DealCandidate[] = [];
    for (const it of items) {
      const hay = `${it.title} ${it.description ?? ""}`;
      if (!DEAL_KEYWORDS.test(hay)) continue;

      const candidate = normalizeRawItem(this.name, {
        sourceId: it.guid ?? it.link ?? it.title,
        rawTitle: it.title,
        rawDescription: it.description,
        externalUrl: it.link,
        imageUrl: it.imageUrl,
        publishedAt: it.pubDate,
      });
      if (candidate) candidates.push(candidate);
      if (candidates.length >= limit) break;
    }

    return candidates;
  }
}
