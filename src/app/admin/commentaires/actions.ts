"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { AdminActionType, AdminTargetType, UserRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/current-user";
import { logAdminAction } from "@/lib/admin/log";

/**
 * Suppression admin d'un commentaire. On applique la même logique que
 * la suppression auteur : soft-delete si des réponses existent (sinon
 * on casserait le thread), hard-delete sinon.
 *
 * Le `commentCount` du deal parent est décrémenté dans la même
 * transaction — c'est un compteur dénormalisé qu'il ne faut pas laisser
 * dériver.
 */
export async function adminDeleteCommentAction(formData: FormData) {
  const admin = await requireRole(UserRole.MODERATOR, "/admin/commentaires");

  const commentId = String(formData.get("commentId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim() || null;

  if (!commentId) {
    redirect(
      "/admin/commentaires?error=" +
        encodeURIComponent("Commentaire introuvable."),
    );
  }

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: {
      id: true,
      content: true,
      authorId: true,
      isDeleted: true,
      deal: { select: { id: true, slug: true } },
      _count: { select: { replies: true } },
    },
  });
  if (!comment) {
    redirect(
      "/admin/commentaires?error=" +
        encodeURIComponent("Commentaire introuvable."),
    );
  }
  if (comment.isDeleted) {
    redirect(
      "/admin/commentaires?success=" +
        encodeURIComponent("Commentaire déjà supprimé."),
    );
  }

  const snippet = comment.content.slice(0, 200);

  if (comment._count.replies > 0) {
    await prisma.$transaction([
      prisma.comment.update({
        where: { id: comment.id },
        data: { isDeleted: true, content: "" },
      }),
      ...(comment.deal
        ? [
            prisma.deal.update({
              where: { id: comment.deal.id },
              data: { commentCount: { decrement: 1 } },
            }),
          ]
        : []),
    ]);
  } else {
    await prisma.$transaction([
      prisma.comment.delete({ where: { id: comment.id } }),
      ...(comment.deal
        ? [
            prisma.deal.update({
              where: { id: comment.deal.id },
              data: { commentCount: { decrement: 1 } },
            }),
          ]
        : []),
    ]);
  }

  await logAdminAction({
    adminId: admin.id,
    action: AdminActionType.DELETE_COMMENT,
    targetType: AdminTargetType.COMMENT,
    targetId: comment.id,
    reason,
    metadata: {
      authorId: comment.authorId,
      dealSlug: comment.deal?.slug ?? null,
      snippet,
      softDeleted: comment._count.replies > 0,
    },
  });

  if (comment.deal?.slug) {
    revalidatePath(`/bons-plans/${comment.deal.slug}`);
    revalidateTag(`deal:${comment.deal.slug}`);
  }
  revalidatePath("/admin/commentaires");
  redirect(
    "/admin/commentaires?success=" + encodeURIComponent("Commentaire supprimé."),
  );
}
