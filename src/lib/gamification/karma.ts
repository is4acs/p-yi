import {
  KarmaAction,
  NotificationType,
  Prisma,
  UserLevel,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/log";
import { dispatchNotification } from "@/lib/notifications/dispatch";

import { KARMA_RULES } from "./actions";
import { computeLevel, LEVEL_META } from "./levels";
import {
  findCrossedMilestones,
  MILESTONE_META,
} from "./milestones";

type PrismaTx = Prisma.TransactionClient;

/**
 * Signature d'entrée de `awardKarma`. Les `*Id` sont optionnels et servent
 * uniquement à tracer dans `KarmaHistory` l'objet qui a déclenché la
 * récompense — utile pour que la page Récompenses puisse linker vers le
 * deal / listing / commentaire en question.
 *
 * `points` permet d'override la valeur de `KARMA_RULES[action]` (surtout
 * utile pour `ADMIN_ADJUSTMENT` où la valeur est décidée par l'admin).
 */
export type AwardKarmaInput = {
  userId: string;
  action: KarmaAction;
  points?: number;
  description?: string;
  dealId?: string;
  listingId?: string;
  commentId?: string;
};

export type AwardKarmaResult = {
  awarded: boolean;
  points: number;
  totalKarma: number;
  levelUp: { from: UserLevel; to: UserLevel } | null;
};

/**
 * Attribue du karma à un utilisateur de manière transactionnelle :
 *  - écrit une ligne dans KarmaHistory (audit + affichage dans /recompenses)
 *  - incrémente User.karma
 *  - recalcule User.level et crée une notification LEVEL_UP si franchi
 *
 * Pour les actions `oneShot` (profile complete, anniversary), on vérifie
 * l'historique avant d'accorder les points : ça empêche un utilisateur de
 * farmer en (dé)cochant son téléphone, et évite qu'un bug client double
 * les appels. Renvoie `{ awarded: false }` dans ce cas.
 *
 * En cas d'erreur DB, on loggue et renvoie `{ awarded: false }` sans
 * throw — un échec de gamification ne doit pas casser l'action métier
 * qui l'a déclenchée (poster un deal, voter, etc.).
 */
export async function awardKarma(
  input: AwardKarmaInput,
  tx?: PrismaTx,
): Promise<AwardKarmaResult> {
  const client: PrismaTx | typeof prisma = tx ?? prisma;
  const rule = KARMA_RULES[input.action];
  const points = input.points ?? rule.points;

  if (points === 0) {
    return { awarded: false, points: 0, totalKarma: 0, levelUp: null };
  }

  try {
    // Si l'action est one-shot, vérifier qu'elle n'a pas déjà été accordée.
    if (rule.oneShot) {
      const existing = await client.karmaHistory.findFirst({
        where: { userId: input.userId, action: input.action },
        select: { id: true },
      });
      if (existing) {
        const user = await client.user.findUnique({
          where: { id: input.userId },
          select: { karma: true },
        });
        return {
          awarded: false,
          points: 0,
          totalKarma: user?.karma ?? 0,
          levelUp: null,
        };
      }
    }

    const description = input.description ?? rule.label;

    // Écriture atomique : history + incrément du karma. Si on n'est pas
    // déjà dans une transaction, on en ouvre une pour garantir que les
    // deux restent cohérents.
    const run = async (t: PrismaTx) => {
      await t.karmaHistory.create({
        data: {
          userId: input.userId,
          action: input.action,
          points,
          description,
          dealId: input.dealId ?? null,
          listingId: input.listingId ?? null,
          commentId: input.commentId ?? null,
        },
      });

      const updated = await t.user.update({
        where: { id: input.userId },
        data: { karma: { increment: points } },
        select: { id: true, karma: true, level: true },
      });

      return updated;
    };

    const updated = tx
      ? await run(tx as PrismaTx)
      : await prisma.$transaction(run);

    // Détection des paliers "round numbers" franchis par cet award.
    // On calcule le karma AVANT increment pour comparer correctement.
    // findCrossedMilestones renvoie [] si points <= 0 ou si aucun
    // palier n'a été franchi. Le dispatch est fait hors-transaction
    // pour ne pas tenir la tx ouverte sur un endpoint push/email.
    const karmaBefore = updated.karma - points;
    const crossedMilestones = findCrossedMilestones(karmaBefore, updated.karma);
    for (const milestone of crossedMilestones) {
      const meta = MILESTONE_META[milestone];
      void dispatchNotification({
        userId: updated.id,
        type: NotificationType.KARMA_MILESTONE,
        title: meta.title,
        message: meta.message,
        actionPath: "/profil/recompenses",
        pushTag: `karma-milestone:${milestone}`,
      }).catch((err) => {
        logger.warn("gamification.milestone.dispatch.failed", {
          userId: updated.id,
          milestone,
          err: err instanceof Error ? err.message : String(err),
        });
      });
    }

    const newLevel = computeLevel(updated.karma);
    let levelUp: AwardKarmaResult["levelUp"] = null;

    if (newLevel !== updated.level) {
      // Montée (ou baisse) de niveau → on persiste et notifie uniquement
      // en cas de montée. Une baisse de niveau arrive si un admin retire
      // beaucoup de karma ou si un deal est removed.
      await (tx ?? prisma).user.update({
        where: { id: updated.id },
        data: { level: newLevel },
      });

      const rankBefore = LEVEL_META[updated.level].minKarma;
      const rankAfter = LEVEL_META[newLevel].minKarma;
      if (rankAfter > rankBefore) {
        levelUp = { from: updated.level, to: newLevel };
        // On stocke l'intent hors du closure transactionnel — le
        // dispatch effectif a lieu APRÈS commit (push + email +
        // in-app). Si on était déjà dans une tx externe (tx !==
        // undefined), on dispatch quand même hors — l'intent de notif
        // ne doit pas tenir la tx ouverte sur un endpoint Resend.
        const payload = {
          userId: updated.id,
          type: NotificationType.LEVEL_UP,
          title: `Nouveau niveau : ${LEVEL_META[newLevel].label} ${LEVEL_META[newLevel].emoji}`,
          message: LEVEL_META[newLevel].tagline,
          actionPath: "/profil/recompenses",
        };
        // Fire-and-forget : le résultat est logué par dispatchNotification
        // en cas d'échec.
        void dispatchNotification(payload).catch((err) => {
          logger.warn("gamification.levelUp.dispatch.failed", {
            userId: updated.id,
            err: err instanceof Error ? err.message : String(err),
          });
        });
      }
    }

    return {
      awarded: true,
      points,
      totalKarma: updated.karma,
      levelUp,
    };
  } catch (err) {
    logger.error("gamification.awardKarma.failed", {
      userId: input.userId,
      action: input.action,
      err: err instanceof Error ? err.message : String(err),
    });
    return { awarded: false, points: 0, totalKarma: 0, levelUp: null };
  }
}
