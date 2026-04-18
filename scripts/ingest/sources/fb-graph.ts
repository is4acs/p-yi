/**
 * Source : Facebook Graph API v19 — posts publics de pages Guyane.
 *
 * IMPORTANT : Facebook interdit le scraping direct de ses pages HTML
 * (ToS + anti-bot). La voie propre est Graph API avec un **Page Access
 * Token** (PAT). Un PAT s'obtient :
 *   - en étant admin de la Page (Dashboard Meta for Developers),
 *   - ou en demandant au community manager de la page de t'en générer un,
 *   - ou via un app OAuth "Business Integration" approuvé par Meta.
 *
 * Sans token valide, cette source log un warn et retourne 0 candidats.
 * Pas de fallback scraping HTML ici — trop risqué (ban IP / compte).
 *
 * ENV :
 *   PEYI_FB_ACCESS_TOKEN   Page Access Token (long-lived recommandé)
 *   PEYI_FB_PAGE_IDS       IDs de pages séparés par des virgules, ex:
 *                          "123456,7891011"  (pas les noms, les IDs)
 *
 * Les posts Facebook ne sont pas structurés → on s'appuie sur le pipeline
 * standard (`normalizeRawItem`) qui extrait prix + classifie + filtre
 * via `isLocalInStore`. Autrement dit : seuls les posts FB qui mentionnent
 * explicitement un magasin Guyane ou une ville Guyane passent.
 */
import type { DealCandidate, Source } from "../types";
import { fetchText } from "../lib/fetch";
import { normalizeRawItem } from "./base";

type FbPost = {
  id: string;
  message?: string;
  created_time?: string;
  permalink_url?: string;
  full_picture?: string;
};

type FbResponse = {
  data: FbPost[];
  paging?: { next?: string };
  error?: { message: string; code: number };
};

const API_VERSION = "v19.0";

export class FacebookGraphSource implements Source {
  readonly name = "fb-graph";
  private readonly token?: string;
  private readonly pageIds: string[];

  constructor(
    token = process.env.PEYI_FB_ACCESS_TOKEN,
    pageIds = (process.env.PEYI_FB_PAGE_IDS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  ) {
    this.token = token;
    this.pageIds = pageIds;
  }

  async fetch(limit: number): Promise<DealCandidate[]> {
    if (!this.token || this.pageIds.length === 0) {
      console.warn(
        `  ⚠️  fb-graph désactivé — configure PEYI_FB_ACCESS_TOKEN + PEYI_FB_PAGE_IDS (voir README)`,
      );
      return [];
    }

    const fields = ["id", "message", "created_time", "permalink_url", "full_picture"].join(",");
    const perPage = Math.min(25, Math.ceil(limit / this.pageIds.length) + 5);
    const candidates: DealCandidate[] = [];

    for (const pageId of this.pageIds) {
      const url =
        `https://graph.facebook.com/${API_VERSION}/${encodeURIComponent(pageId)}/posts` +
        `?fields=${fields}&limit=${perPage}&access_token=${encodeURIComponent(this.token)}`;

      let raw: string;
      try {
        raw = await fetchText(url, {
          headers: { Accept: "application/json" },
        });
      } catch (err) {
        console.warn(`  ⚠️  fb-graph page ${pageId} : ${(err as Error).message}`);
        continue;
      }

      let body: FbResponse;
      try {
        body = JSON.parse(raw);
      } catch {
        console.warn(`  ⚠️  fb-graph page ${pageId} : réponse JSON invalide`);
        continue;
      }

      if (body.error) {
        console.warn(
          `  ⚠️  fb-graph page ${pageId} : API error ${body.error.code} ${body.error.message}`,
        );
        continue;
      }

      for (const post of body.data ?? []) {
        if (!post.message) continue;
        const firstLine = post.message.split("\n")[0].slice(0, 120);

        const candidate = normalizeRawItem(this.name, {
          sourceId: post.id,
          rawTitle: firstLine,
          rawDescription: post.message.slice(0, 1000),
          externalUrl: post.permalink_url,
          imageUrl: post.full_picture,
          publishedAt: post.created_time ? new Date(post.created_time) : undefined,
          extras: { pageId },
        });
        if (candidate) candidates.push(candidate);
        if (candidates.length >= limit) return candidates;
      }
    }

    return candidates;
  }
}
