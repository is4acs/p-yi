import { KarmaAction, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export const karmaHistorySelect = {
  id: true,
  action: true,
  points: true,
  description: true,
  dealId: true,
  listingId: true,
  commentId: true,
  createdAt: true,
} satisfies Prisma.KarmaHistorySelect;

export type KarmaHistoryRow = Prisma.KarmaHistoryGetPayload<{
  select: typeof karmaHistorySelect;
}>;

/**
 * Les 30 derniers mouvements de karma de l'utilisateur. Suffisant pour la
 * page Récompenses — on ne prévoit pas de pagination complète dans cette
 * première version (si un user dépasse, il scroll dans son historique
 * récent, pas d'archive).
 */
export async function fetchKarmaHistory(
  userId: string,
  limit = 30,
): Promise<KarmaHistoryRow[]> {
  return prisma.karmaHistory.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: karmaHistorySelect,
  });
}

export type BadgeRow = {
  id: string;
  slug: string;
  name: string;
  emoji: string | null;
  description: string;
  earned: boolean;
  earnedAt: Date | null;
};

/**
 * Liste complète des badges, en marquant ceux déjà débloqués par l'user.
 * On ne stocke pas la date d'obtention dans la table de relation implicite
 * Prisma — on utilise donc `KarmaHistory` comme proxy faute de mieux, mais
 * vu qu'on ne log pas l'award de badge dans karma history, on se contente
 * de `earned = true/false` sans date précise. C'est suffisant pour l'UI.
 */
export async function fetchBadgesForUser(userId: string): Promise<BadgeRow[]> {
  const [allBadges, user] = await Promise.all([
    prisma.badge.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        slug: true,
        name: true,
        emoji: true,
        description: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { badges: { select: { id: true } } },
    }),
  ]);

  const owned = new Set(user?.badges.map((b) => b.id) ?? []);

  return allBadges.map((b) => ({
    ...b,
    earned: owned.has(b.id),
    earnedAt: null,
  }));
}

export type ContributorStats = {
  dealsPublished: number;
  listingsPublished: number;
  commentsPosted: number;
  hotDeals: number;
};

/**
 * Compteurs agrégés pour la page Récompenses. Quatre compteurs en parallèle
 * — un seul round-trip par compteur en Prisma mais le tout dans un
 * `Promise.all` pour limiter la latence totale.
 */
export async function fetchContributorStats(
  userId: string,
): Promise<ContributorStats> {
  const [dealsPublished, listingsPublished, commentsPosted, hotDeals] =
    await Promise.all([
      prisma.deal.count({
        where: { authorId: userId, status: "PUBLISHED" },
      }),
      prisma.listing.count({
        where: { authorId: userId, status: "PUBLISHED" },
      }),
      prisma.comment.count({
        where: { authorId: userId, isDeleted: false },
      }),
      prisma.deal.count({
        where: {
          authorId: userId,
          status: "PUBLISHED",
          temperature: { gte: 100 },
        },
      }),
    ]);

  return { dealsPublished, listingsPublished, commentsPosted, hotDeals };
}

export type LeaderboardEntry = {
  id: string;
  username: string;
  avatarUrl: string | null;
  karma: number;
  level: ContributorLevel;
  cityName: string | null;
  rank: number;
};

type ContributorLevel = Prisma.UserGetPayload<{
  select: { level: true };
}>["level"];

/**
 * Top contributeurs par karma, avec leur ville pour l'UX "Chasseur de Kourou".
 * On filtre les utilisateurs bannis pour ne pas mettre en avant du contenu
 * problématique, et on limite à `limit` pour garder la requête rapide.
 */
export async function fetchLeaderboard(
  limit = 50,
): Promise<LeaderboardEntry[]> {
  const users = await prisma.user.findMany({
    where: { isBanned: false, shadowBanned: false, karma: { gt: 0 } },
    orderBy: [{ karma: "desc" }, { createdAt: "asc" }],
    take: limit,
    select: {
      id: true,
      username: true,
      avatarUrl: true,
      karma: true,
      level: true,
      city: { select: { name: true } },
    },
  });

  return users.map((u, idx) => ({
    id: u.id,
    username: u.username,
    avatarUrl: u.avatarUrl,
    karma: u.karma,
    level: u.level,
    cityName: u.city?.name ?? null,
    rank: idx + 1,
  }));
}

/**
 * Rang de l'utilisateur courant parmi les contributeurs actifs. Null s'il
 * n'a pas encore de karma. Utilisé sur la page /classement pour afficher
 * "Tu es #X sur Y".
 */
export async function fetchUserRank(
  userId: string,
): Promise<{ rank: number; total: number } | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { karma: true, isBanned: true },
  });
  if (!user || user.isBanned || user.karma <= 0) return null;

  const [ahead, total] = await Promise.all([
    prisma.user.count({
      where: {
        isBanned: false,
        shadowBanned: false,
        karma: { gt: user.karma },
      },
    }),
    prisma.user.count({
      where: {
        isBanned: false,
        shadowBanned: false,
        karma: { gt: 0 },
      },
    }),
  ]);
  return { rank: ahead + 1, total };
}

export function humanizeKarmaAction(action: KarmaAction): string {
  switch (action) {
    case KarmaAction.DEAL_POSTED:
      return "Bon plan publié";
    case KarmaAction.DEAL_HOT_100:
      return "Deal à +100°";
    case KarmaAction.DEAL_HOT_500:
      return "Deal à +500°";
    case KarmaAction.COMMENT_USEFUL:
      return "Commentaire utile";
    case KarmaAction.REPORT_VALID:
      return "Signalement confirmé";
    case KarmaAction.REFERRAL:
      return "Parrainage";
    case KarmaAction.PROFILE_COMPLETE:
      return "Profil complété";
    case KarmaAction.DAILY_LOGIN:
      return "Connexion quotidienne";
    case KarmaAction.ANNIVERSARY:
      return "Anniversaire Péyi";
    case KarmaAction.ADMIN_ADJUSTMENT:
      return "Ajustement admin";
    case KarmaAction.DEAL_REMOVED:
      return "Bon plan retiré";
    case KarmaAction.SPAM_PENALTY:
      return "Pénalité spam";
  }
}
