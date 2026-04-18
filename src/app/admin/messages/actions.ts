"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AdminActionType, AdminTargetType, UserRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/current-user";
import { logAdminAction } from "@/lib/admin/log";

/**
 * Suppression d'un message privé en modération. Hard delete (pas de
 * flag isDeleted sur Message). On capture le contenu dans les metadata
 * avant suppression pour traçabilité.
 */
export async function adminDeleteMessageAction(formData: FormData) {
  const admin = await requireRole(UserRole.MODERATOR, "/admin/messages");

  const messageId = String(formData.get("messageId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim() || null;

  if (!messageId) {
    redirect(
      "/admin/messages?error=" + encodeURIComponent("Message introuvable."),
    );
  }

  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: {
      id: true,
      content: true,
      senderId: true,
      recipientId: true,
    },
  });
  if (!message) {
    redirect(
      "/admin/messages?error=" + encodeURIComponent("Message introuvable."),
    );
  }

  await prisma.message.delete({ where: { id: message.id } });

  await logAdminAction({
    adminId: admin.id,
    action: AdminActionType.DELETE_MESSAGE,
    targetType: AdminTargetType.MESSAGE,
    targetId: message.id,
    reason,
    metadata: {
      senderId: message.senderId,
      recipientId: message.recipientId,
      snippet: message.content.slice(0, 200),
    },
  });

  revalidatePath("/admin/messages");
  redirect("/admin/messages?success=" + encodeURIComponent("Message supprimé."));
}
