/**
 * Source : franceguyane.fr — quotidien régional Guyane.
 *
 * Couverture économie/consommation locale (arrivages, grande
 * distribution, fiscalité). On scanne le flux principal et on filtre
 * les articles évoquant une promo (prix, remise, offre, rayon...).
 *
 * URL flux : configurable via env `PEYI_INGEST_FRANCEGUYANE_RSS`,
 * défaut https://www.franceguyane.fr/rss.xml — à ajuster selon la
 * structure réelle du site (certains WordPress exposent /feed/, d'autres
 * /?feed=rss2).
 */
import type { DealCandidate, Source } from "../types";
import { fetchText } from "../lib/fetch";
import { parseRss } from "../lib/parse-rss";
import { normalizeRawItem } from "./base";

const DEFAULT_FEED = "https://www.franceguyane.fr/rss.xml";
const DEAL_KEYWORDS =
  /\b(promo|bon\s*plan|offre|r[eé]duction|solde|arrivage|-\s*\d+\s*%|\d+\s*€|euros?|prix\s+cass)/i;

export class FranceGuyaneRssSource implements Source {
  readonly name = "franceguyane-rss";
  private readonly feedUrl: string;

  constructor(
    feedUrl = process.env.PEYI_INGEST_FRANCEGUYANE_RSS ?? DEFAULT_FEED,
  ) {
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
