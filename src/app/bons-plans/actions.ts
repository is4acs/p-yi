"use server";

import { revalidatePath } from "next/cache";
import { VoteType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/auth/current-user";

const KARMA_HOT_VOTE_AUTHOR = 1;

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
    select: { id: true, authorId: true, slug: true },
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

  if (karmaDelta !== 0) {
    await prisma.user.update({
      where: { id: deal.authorId },
      data: { karma: { increment: karmaDelta } },
    });
  }

  revalidatePath("/bons-plans");
  revalidatePath(`/bons-plans/${deal.slug}`);

  return {
    ok: true,
    temperature: updated.temperature,
    upvotes: updated.upvotes,
    downvotes: updated.downvotes,
    myVote: finalVote,
  };
}
