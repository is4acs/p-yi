"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/current-user";
import { createCommentSchema } from "@/lib/validation/comment";
import { writeLimiter } from "@/lib/rate-limit";

const KARMA_COMMENT = 2;

function formatRateLimitMessage(reset: number): string {
  const secondsLeft = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
  if (secondsLeft >= 60) {
    return `Trop de commentaires en peu de temps. Réessaye dans ${Math.ceil(secondsLeft / 60)} min.`;
  }
  return `Trop de commentaires en peu de temps. Réessaye dans ${secondsLeft}s.`;
}

export type CommentActionResult = {
  ok: boolean;
  error?: string;
};

export async function createCommentAction(
  formData: FormData,
): Promise<CommentActionResult> {
  const user = await requireUser();

  const { success, reset } = await writeLimiter.limit(
    `comment:create:${user.id}`,
  );
  if (!success) {
    return { ok: false, error: formatRateLimitMessage(reset) };
  }

  const parsed = createCommentSchema.safeParse({
    dealId: formData.get("dealId"),
    parentId: formData.get("parentId") ?? undefined,
    content: formData.get("content"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Commentaire invalide.",
    };
  }
  const { dealId, parentId, content } = parsed.data;

  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    select: { id: true, slug: true },
  });
  if (!deal) return { ok: false, error: "Bon plan introuvable." };

  if (parentId) {
    const parent = await prisma.comment.findUnique({
      where: { id: parentId },
      select: { id: true, dealId: true, parentId: true },
    });
    if (!parent || parent.dealId !== deal.id) {
      return { ok: false, error: "Commentaire parent introuvable." };
    }
    // Flatten threading to a single level — reply to a reply lands on the
    // same top-level thread.
    const effectiveParentId = parent.parentId ?? parent.id;

    await prisma.$transaction([
      prisma.comment.create({
        data: {
          dealId: deal.id,
          authorId: user.id,
          parentId: effectiveParentId,
          content,
        },
      }),
      prisma.deal.update({
        where: { id: deal.id },
        data: { commentCount: { increment: 1 } },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { karma: { increment: KARMA_COMMENT } },
      }),
    ]);
  } else {
    await prisma.$transaction([
      prisma.comment.create({
        data: {
          dealId: deal.id,
          authorId: user.id,
          content,
        },
      }),
      prisma.deal.update({
        where: { id: deal.id },
        data: { commentCount: { increment: 1 } },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { karma: { increment: KARMA_COMMENT } },
      }),
    ]);
  }

  revalidatePath(`/bons-plans/${deal.slug}`);
  return { ok: true };
}

export async function deleteCommentAction(
  formData: FormData,
): Promise<CommentActionResult> {
  const user = await requireUser();

  const commentId = formData.get("commentId");
  if (typeof commentId !== "string" || !commentId) {
    return { ok: false, error: "Commentaire introuvable." };
  }

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: {
      id: true,
      authorId: true,
      isDeleted: true,
      deal: { select: { id: true, slug: true } },
      _count: { select: { replies: true } },
    },
  });
  if (!comment || !comment.deal) {
    return { ok: false, error: "Commentaire introuvable." };
  }
  if (comment.authorId !== user.id) {
    return { ok: false, error: "Tu ne peux supprimer que tes commentaires." };
  }
  if (comment.isDeleted) {
    return { ok: true };
  }

  // Soft-delete when replies exist (preserves the thread), hard-delete
  // otherwise to keep the DB clean.
  if (comment._count.replies > 0) {
    await prisma.$transaction([
      prisma.comment.update({
        where: { id: comment.id },
        data: { isDeleted: true, content: "" },
      }),
      prisma.deal.update({
        where: { id: comment.deal.id },
        data: { commentCount: { decrement: 1 } },
      }),
    ]);
  } else {
    await prisma.$transaction([
      prisma.comment.delete({ where: { id: comment.id } }),
      prisma.deal.update({
        where: { id: comment.deal.id },
        data: { commentCount: { decrement: 1 } },
      }),
    ]);
  }

  revalidatePath(`/bons-plans/${comment.deal.slug}`);
  return { ok: true };
}
