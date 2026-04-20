"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { KarmaAction, NotificationType, VoteType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/auth/current-user";
import { awardKarma } from "@/lib/gamification/karma";
import { checkAndAwardBadges } from "@/lib/gamification/badges";
import { dispatchNotification } from "@/lib/notifications/dispatch";

const KARMA_HOT_VOTE_AUTHOR = 1;

// Seuils de température qui déclenchent un bonus de karma "one-shot" pour
// l'auteur du deal. Liste ordonnée du plus petit au plus grand : on check
// dans cet ordre pour accorder le premier palier atteint. Chaque palier
// n'est accordé qu'une fois par deal grâce à la contrainte d'historique
// (on cherche dans KarmaHistory si l'action + dealId existe déjà).
const TEMPERATURE_MILESTONES: { threshold: number; action: KarmaAction }[] = [
  { threshold: 100, action: KarmaAction.DEAL_HOT_100 },
  { threshold: 500, action: KarmaAction.DEAL_HOT_500 },
];

export type VoteInput = "HOT" | "COLD";

export type VoteResult = {
  ok: boolean;
  error?: string;
  temperature?: number;
  upvotes?: number;
  downvotes?: number;
  myVote?: VoteType | null;
};

/**
 * Toggle or switch a user's vote on a deal.
 * - First click on HOT/COLD  → creates the vote
 * - Same value again         → removes the vote (toggle off)
 * - Opposite value           → switches HOT <-> COLD
 * Author cannot vote on their own deal.
 */
export async function voteDealAction(
  dealId: string,
  input: VoteInput,
): Promise<VoteResult> {
  if (input !== "HOT" && input !== "COLD") {
    return { ok: false, error: "Vote invalide." };
  }

  const user = await requireActiveUser();

  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    select: {
      id: true,
      authorId: true,
      slug: true,
      title: true,
      temperature: true,
    },
  });
  if (!deal) return { ok: false, error: "Bon plan introuvable." };
  if (deal.authorId === user.id) {
    return { ok: false, error: "Tu ne peux pas voter sur ton propre bon plan." };
  }

  const existing = await prisma.vote.findUnique({
    where: { userId_dealId: { userId: user.id, dealId: deal.id } },
    select: { id: true, value: true },
  });

  const target: VoteType = input === "HOT" ? VoteType.HOT : VoteType.COLD;

  // Delta on the denormalized counters
  let upDelta = 0;
  let downDelta = 0;
  let karmaDelta = 0;
  let finalVote: VoteType | null = null;

  if (!existing) {
    await prisma.vote.create({
      data: { userId: user.id, dealId: deal.id, value: target },
    });
    if (target === VoteType.HOT) {
      upDelta = 1;
      karmaDelta = KARMA_HOT_VOTE_AUTHOR;
    } else {
      downDelta = 1;
    }
    finalVote = target;
  } else if (existing.value === target) {
    // Toggle off
    await prisma.vote.delete({ where: { id: existing.id } });
    if (target === VoteType.HOT) {
      upDelta = -1;
      karmaDelta = -KARMA_HOT_VOTE_AUTHOR;
    } else {
      downDelta = -1;
    }
    finalVote = null;
  } else {
    // Switch
    await prisma.vote.update({
      where: { id: existing.id },
      data: { value: target },
    });
    if (target === VoteType.HOT) {
      upDelta = 1;
      downDelta = -1;
      karmaDelta = KARMA_HOT_VOTE_AUTHOR;
    } else {
      upDelta = -1;
      downDelta = 1;
      karmaDelta = -KARMA_HOT_VOTE_AUTHOR;
    }
    finalVote = target;
  }

  const updated = await prisma.deal.update({
    where: { id: deal.id },
    data: {
      upvotes: { increment: upDelta },
      downvotes: { increment: downDelta },
      // temperature: HOT = +10, COLD = -5 (matches the VoteType enum doc)
      temperature: { increment: upDelta * 10 + downDelta * -5 },
    },
    select: {
      temperature: true,
      upvotes: true,
      downvotes: true,
    },
  });

  // Le karma "+1 par vote chaud" continue d'être une écriture directe :
  // il est trop fréquent pour mériter une ligne KarmaHistory à chaque
  // clic, et les toggles off doivent pouvoir le décrémenter proprement
  // sans casser l'audit trail.
  if (karmaDelta !== 0) {
    await prisma.user.update({
      where: { id: deal.authorId },
      data: { karma: { increment: karmaDelta } },
    });
  }

  // Milestones de température : à chaque franchissement d'un seuil par le
  // HAUT uniquement, on accorde un bonus one-shot à l'auteur via
  // KarmaHistory. La contrainte "une fois par deal" est portée par le
  // check `findFirst(action + dealId)` ci-dessous — un deal qui redescend
  // sous 100° puis remonte ne re-trigger pas la récompense.
  if (upDelta > 0 || downDelta < 0) {
    for (const { threshold, action } of TEMPERATURE_MILESTONES) {
      if (updated.temperature >= threshold && deal.temperature < threshold) {
        const already = await prisma.karmaHistory.findFirst({
          where: {
            userId: deal.authorId,
            action,
            dealId: deal.id,
          },
          select: { id: true },
        });
        if (!already) {
          await awardKarma({
            userId: deal.authorId,
            action,
            dealId: deal.id,
            description: `Ton deal a atteint +${threshold}°`,
          });
          // Notif "deal hot" — in-app + push + email (respecte les prefs).
          // On passe par dispatchNotification pour bénéficier du même
          // pipeline que les messages/commentaires. Déclenché une seule
          // fois par palier grâce au gardien KarmaHistory ci-dessus.
          await dispatchNotification({
            userId: deal.authorId,
            type: NotificationType.DEAL_HOT,
            title: `🔥 Ton bon plan est à +${threshold}°`,
            message: `« ${deal.title.slice(0, 80)}${
              deal.title.length > 80 ? "…" : ""
            } » chauffe sur Péyi. Continue comme ça !`,
            actionPath: `/bons-plans/${deal.slug}`,
            dealId: deal.id,
            pushTag: `deal-hot:${deal.id}:${threshold}`,
          });
        }
      }
    }
    await checkAndAwardBadges(deal.authorId);
  }

  revalidatePath("/bons-plans");
  revalidatePath(`/bons-plans/${deal.slug}`);
  revalidateTag(`deal:${deal.slug}`);

  return {
    ok: true,
    temperature: updated.temperature,
    upvotes: updated.upvotes,
    downvotes: updated.downvotes,
    myVote: finalVote,
  };
}
