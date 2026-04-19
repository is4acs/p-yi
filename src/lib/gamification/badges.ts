import { NotificationType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/log";
import { dispatchNotification } from "@/lib/notifications/dispatch";

// Chaque badge seedé porte un `requirement` JSON de la forme
// `{ type, threshold }`. On le type ici pour centraliser les règles
// d'évaluation. Si un nouveau type est ajouté côté seed, il faut
// l'ajouter ici aussi — sinon il n'est jamais débloqué.
type BadgeRequirement =
  | { type: "deal_count"; threshold: number }
  | { type: "comment_count"; threshold: number }
  | { type: "karma"; threshold: number }
  | { type: "deal_temperature"; threshold: number }
  | { type: "categories_count"; threshold: number }
  | { type: "valid_reports"; threshold: number }
  | { type: "days_since_signup"; threshold: number }
  | { type: "user_id_order"; threshold: number };

function parseRequirement(raw: unknown): BadgeRequirement | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.type !== "string" || typeof r.threshold !== "number") return null;
  switch (r.type) {
    case "deal_count":
    case "comment_count":
    case "karma":
    case "deal_temperature":
    case "categories_count":
    case "valid_reports":
    case "days_since_signup":
    case "user_id_order":
      return { type: r.type, threshold: r.threshold };
    default:
      return null;
  }
}

/**
 * Évalue si `userId` satisfait `req`. Les stats sont recalculées à la
 * volée en DB — c'est OK tant que le volume par user reste raisonnable
 * (< 1k deals), ce qui est le cas ici. Si un utilisateur se rapproche
 * du plafond, on pourra mémoriser des compteurs dénormalisés.
 *
 * Pour `user_id_order` (pionnier = 100 premiers inscrits), on classe
 * par `createdAt` asc : simple, déterministe, et tolérant aux UUID.
 */
async function checkRequirement(
  userId: string,
  req: BadgeRequirement,
): Promise<boolean> {
  switch (req.type) {
    case "deal_count": {
      const n = await prisma.deal.count({
        where: { authorId: userId, status: "PUBLISHED" },
      });
      return n >= req.threshold;
    }
    case "comment_count": {
      const n = await prisma.comment.count({
        where: { authorId: userId, isDeleted: false },
      });
      return n >= req.threshold;
    }
    case "karma": {
      const u = await prisma.user.findUnique({
        where: { id: userId },
        select: { karma: true },
      });
      return (u?.karma ?? 0) >= req.threshold;
    }
    case "deal_temperature": {
      const hot = await prisma.deal.findFirst({
        where: { authorId: userId, temperature: { gte: req.threshold } },
        select: { id: true },
      });
      return Boolean(hot);
    }
    case "categories_count": {
      const groups = await prisma.deal.groupBy({
        by: ["categoryId"],
        where: { authorId: userId, status: "PUBLISHED" },
      });
      return groups.length >= req.threshold;
    }
    case "valid_reports": {
      const n = await prisma.report.count({
        where: { reporterId: userId, status: "RESOLVED" },
      });
      return n >= req.threshold;
    }
    case "days_since_signup": {
      const u = await prisma.user.findUnique({
        where: { id: userId },
        select: { createdAt: true },
      });
      if (!u) return false;
      const days = (Date.now() - u.createdAt.getTime()) / 86_400_000;
      return days >= req.threshold;
    }
    case "user_id_order": {
      const u = await prisma.user.findUnique({
        where: { id: userId },
        select: { createdAt: true },
      });
      if (!u) return false;
      const earlier = await prisma.user.count({
        where: { createdAt: { lt: u.createdAt } },
      });
      return earlier < req.threshold;
    }
  }
}

/**
 * Passe en revue tous les badges pas encore obtenus par l'utilisateur,
 * évalue leur `requirement`, et accorde ceux qui matchent. Pour chaque
 * badge obtenu, on connecte la relation users<->badges et on crée une
 * notification BADGE_EARNED.
 *
 * Appelé depuis les actions qui peuvent déclencher un badge (publier
 * un deal, commenter, voter, etc.). Best-effort : une erreur ici est
 * loggée mais n'impacte pas l'action qui a déclenché le check.
 */
export async function checkAndAwardBadges(
  userId: string,
): Promise<{ awarded: { slug: string; name: string; emoji: string | null }[] }> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { badges: { select: { id: true } } },
    });
    if (!user) return { awarded: [] };

    const ownedIds = new Set(user.badges.map((b) => b.id));

    const allBadges = await prisma.badge.findMany({
      select: {
        id: true,
        slug: true,
        name: true,
        emoji: true,
        description: true,
        requirement: true,
      },
    });

    const awarded: { slug: string; name: string; emoji: string | null }[] = [];

    for (const badge of allBadges) {
      if (ownedIds.has(badge.id)) continue;
      const req = parseRequirement(badge.requirement);
      if (!req) continue;

      const satisfied = await checkRequirement(userId, req);
      if (!satisfied) continue;

      // Connecte le badge au user — c'est la seule écriture critique.
      // La notif (in-app + push + email) est dispatchée APRÈS, pour
      // que l'attribution du badge ne soit pas bloquée par un canal
      // externe latent et vice-versa.
      await prisma.user.update({
        where: { id: userId },
        data: { badges: { connect: { id: badge.id } } },
      });

      await dispatchNotification({
        userId,
        type: NotificationType.BADGE_EARNED,
        title: `Nouveau badge : ${badge.name}${badge.emoji ? ` ${badge.emoji}` : ""}`,
        message: badge.description,
        actionPath: "/profil/recompenses",
        pushTag: `badge:${badge.slug}`,
      }).catch((err) => {
        logger.warn("gamification.badge.dispatch.failed", {
          userId,
          badge: badge.slug,
          err: err instanceof Error ? err.message : String(err),
        });
      });

      awarded.push({
        slug: badge.slug,
        name: badge.name,
        emoji: badge.emoji,
      });
    }

    return { awarded };
  } catch (err) {
    logger.error("gamification.checkBadges.failed", {
      userId,
      err: err instanceof Error ? err.message : String(err),
    });
    return { awarded: [] };
  }
}
