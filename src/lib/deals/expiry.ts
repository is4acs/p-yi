import { DealStatus, type PrismaClient } from "@prisma/client";

/**
 * Cycle de vie d'un bon plan dépassé.
 *
 * Avant : un deal dont `expiresAt` est passé restait `PUBLISHED` en
 * base. Les listes le filtraient bien à l'affichage (`expiresAt > now`)
 * — d'où la sensation d'offres « masquées » : invisibles dans le feed,
 * mais toujours présentes partout où l'on filtre sur `status` seul
 * (compteurs du hero, favoris, profil, badges, admin).
 *
 * Après, en deux temps (cron quotidien `/api/cron/expire-content`) :
 *   1. **Marquage** — dès l'expiration, `status` passe à `EXPIRED`.
 *      Le bon plan disparaît alors de TOUS les code-paths qui filtrent
 *      `status: PUBLISHED`, sans avoir à penser à `expiresAt`.
 *   2. **Purge** — après `RETENTION_DAYS` jours en `EXPIRED`, la ligne
 *      est supprimée définitivement (cascade Prisma sur images, votes,
 *      commentaires, favoris, clics, signalements) et les fichiers du
 *      bucket `deals` sont nettoyés.
 *
 * Le délai de rétention laisse à l'auteur le temps de retrouver son
 * bon plan expiré (et de le reposter) avant l'effacement, et couvre
 * une expiration saisie par erreur. C'est le seul filet : la
 * suppression est irréversible.
 *
 * Ce module ne dépend QUE de `@prisma/client` (pas de `next/*`, pas de
 * `@/lib/env`) : il est appelé aussi bien depuis la route cron que
 * depuis `scripts/purge-expired-deals.ts` en CLI.
 */

const DAY_MS = 86_400_000;

/** Jours passés en `EXPIRED` avant suppression définitive. */
export const DEFAULT_RETENTION_DAYS = 7;

/**
 * Nombre max de bons plans purgés par passage. Borne le travail d'un
 * run (et donc la durée d'exécution de la fonction serverless) : le
 * reliquat part au run suivant, le cron étant quotidien.
 */
export const DEFAULT_PURGE_LIMIT = 200;

/**
 * Lit `EXPIRED_DEAL_RETENTION_DAYS` (override ops sans redéploiement de
 * code). Toute valeur non entière ou négative retombe sur le défaut —
 * on refuse silencieusement une config cassée plutôt que de purger avec
 * une fenêtre absurde.
 */
export function resolveRetentionDays(
  raw: string | undefined = process.env.EXPIRED_DEAL_RETENTION_DAYS,
): number {
  if (!raw) return DEFAULT_RETENTION_DAYS;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 0) return DEFAULT_RETENTION_DAYS;
  return parsed;
}

/**
 * Client minimal attendu : n'importe quel `PrismaClient` (celui de
 * l'app comme celui instancié par un script CLI).
 */
export type DealDb = Pick<PrismaClient, "deal">;

/**
 * Passe en `EXPIRED` tous les bons plans `PUBLISHED` dont la date de
 * fin est dépassée. Idempotent : un second passage ne remonte rien.
 */
export async function markExpiredDeals(
  db: DealDb,
  now: Date = new Date(),
): Promise<number> {
  const { count } = await db.deal.updateMany({
    where: { status: DealStatus.PUBLISHED, expiresAt: { lt: now } },
    data: { status: DealStatus.EXPIRED },
  });
  return count;
}

export type PurgeCandidate = {
  id: string;
  slug: string;
  title: string;
  expiresAt: Date | null;
  /** Cover + images de la galerie, pour le nettoyage du bucket. */
  imageUrls: string[];
};

/**
 * Sélectionne les bons plans expirés depuis plus de `retentionDays`.
 *
 * Volontairement restreint à `status: EXPIRED` **et** `expiresAt` passé :
 * un brouillon, un bon plan rejeté ou modéré (`REMOVED`) n'est jamais
 * touché par la purge automatique — ces états relèvent de la
 * modération, pas de l'expiration.
 */
export async function collectPurgeableDeals(
  db: DealDb,
  {
    now = new Date(),
    retentionDays = DEFAULT_RETENTION_DAYS,
    limit = DEFAULT_PURGE_LIMIT,
    includeUnmarked = false,
  }: {
    now?: Date;
    retentionDays?: number;
    limit?: number;
    /**
     * Inclut aussi les deals encore `PUBLISHED` dont l'expiration
     * dépasse déjà la rétention. Réservé à l'aperçu dry-run du script
     * CLI, où le marquage n'a pas été appliqué : sans ça l'aperçu
     * sous-estimerait ce que la vraie exécution supprimera.
     */
    includeUnmarked?: boolean;
  } = {},
): Promise<PurgeCandidate[]> {
  const cutoff = new Date(now.getTime() - retentionDays * DAY_MS);
  const statuses = includeUnmarked
    ? [DealStatus.EXPIRED, DealStatus.PUBLISHED]
    : [DealStatus.EXPIRED];

  const deals = await db.deal.findMany({
    where: { status: { in: statuses }, expiresAt: { lt: cutoff } },
    // Les plus anciens d'abord : en cas de gros reliquat, on rattrape
    // le backlog dans l'ordre chronologique.
    orderBy: { expiresAt: "asc" },
    take: limit,
    select: {
      id: true,
      slug: true,
      title: true,
      expiresAt: true,
      coverImageUrl: true,
      images: { select: { url: true } },
    },
  });

  return deals.map((d) => ({
    id: d.id,
    slug: d.slug,
    title: d.title,
    expiresAt: d.expiresAt,
    imageUrls: [
      ...(d.coverImageUrl ? [d.coverImageUrl] : []),
      ...d.images.map((i) => i.url),
    ],
  }));
}

/**
 * Supprime définitivement les bons plans donnés. Les enfants
 * (`DealImage`, `Vote`, `Favorite`, `Comment`, `Click`, `Report`,
 * `Notification`) partent en cascade — cf. `onDelete: Cascade` dans
 * `prisma/schema.prisma`.
 *
 * Le nettoyage du storage est laissé à l'appelant : la route cron passe
 * par le client service-role, le script CLI par le sien.
 */
export async function purgeDeals(
  db: DealDb,
  candidates: PurgeCandidate[],
): Promise<number> {
  if (candidates.length === 0) return 0;
  const { count } = await db.deal.deleteMany({
    where: { id: { in: candidates.map((c) => c.id) } },
  });
  return count;
}
