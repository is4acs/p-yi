/**
 * Types partagés par la pipeline d'ingestion.
 *
 * Flow :
 *   Source.fetch() → RawItem[]
 *   Source.normalize(raw) → DealCandidate (brut, non-classifié)
 *   classify(candidate) → DealCandidate (avec categorySlug, citySlug)
 *   assignAuthor(candidate) → AttributedCandidate
 *   engagement(candidate) → AttributedCandidate (avec votes/comments/temp)
 *   write(candidate) → Prisma upsert
 */

export type RawItem = {
  /** Identifiant stable côté source (guid RSS, url, etc.) */
  sourceId: string;
  /** Titre ou description brute, pas encore normalisé */
  rawTitle: string;
  rawDescription?: string;
  /** URL de l'offre chez le marchand (externalUrl) */
  externalUrl?: string;
  /** URL image principale */
  imageUrl?: string;
  /** Date de publication côté source, sinon new Date() */
  publishedAt?: Date;
  /** Champs libres dépendant de la source (merchant name, category hint) */
  extras?: Record<string, string | undefined>;
};

export type DealCandidate = {
  /** Clé de dédup cross-source (hash titre normalisé + externalUrl) */
  fingerprint: string;
  /** Source d'origine (blada-rss, franceguyane-rss, local-file...) */
  source: string;
  sourceId: string;

  title: string;
  description?: string;
  price: number;
  originalPrice?: number;
  isFree?: boolean;

  externalUrl?: string;
  coverImageUrl?: string;

  /** Slugs à résoudre en ID au moment du write */
  categorySlug: string;
  citySlug?: string;
  storeSlug?: string;
  merchantSlug?: string;

  publishedAt: Date;
  expiresAt?: Date;
};

export type AttributedCandidate = DealCandidate & {
  authorUsername: string;
  temperature: number;
  upvotes: number;
  downvotes: number;
  viewCount: number;
  clickCount: number;
  commentCount: number;
  seedComments: string[]; // contenu des commentaires simulés
};

export interface Source {
  /** Nom court pour les logs et le flag --source */
  readonly name: string;
  /** Fetch + normalize. Peut faire du I/O réseau. */
  fetch(limit: number): Promise<DealCandidate[]>;
}

export type IngestOptions = {
  dryRun: boolean;
  limit: number;
  sourceFilter?: string;
  /**
   * Étalement temporel : si true, publishedAt est répartie sur
   * [spreadDays jours passés ; maintenant] plutôt que la date source.
   * Utile pour un backfill initial qui ne veut pas 200 deals du même
   * jour.
   */
  spread: boolean;
  spreadDays: number;
};
