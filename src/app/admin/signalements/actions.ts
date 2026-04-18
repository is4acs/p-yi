"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  AdminActionType,
  AdminTargetType,
  ReportStatus,
  UserRole,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/current-user";
import { logAdminAction } from "@/lib/admin/log";

/**
 * Marquer un signalement comme résolu ou rejeté.
 *
 * - `action` est un texte libre décidé par le modérateur ("supprimé",
 *   "averti l'auteur", "banni 7j", etc.) ou "dismissed" si on rejette.
 *   On le stocke sur Report.action pour garder une trace visible côté
 *   signalant potentiellement (futur feature).
 * - On stocke aussi reviewedBy/reviewedAt pour la traçabilité par
 *   modérateur (utile quand plusieurs personnes traitent la queue).
 * - Le log AdminActionLog double cette trace au niveau système (un
 *   Report peut être supprimé en cascade si son contenu l'est, donc
 *   on ne compte pas uniquement sur la table Report).
 */
export async function adminResolveReportAction(formData: FormData) {
  const admin = await requireRole(UserRole.MODERATOR, "/admin/signalements");

  const reportId = String(formData.get("reportId") ?? "");
  const resolution = String(formData.get("resolution") ?? "").trim();
  const dismiss = formData.get("dismiss") === "1";

  if (!reportId) {
    redirect(
      "/admin/signalements?error=" +
        encodeURIComponent("Signalement introuvable."),
    );
  }

  const report = await prisma.report.findUnique({
    where: { id: reportId },
    select: {
      id: true,
      status: true,
      reason: true,
      reportedUserId: true,
      dealId: true,
      listingId: true,
      commentId: true,
    },
  });
  if (!report) {
    redirect(
      "/admin/signalements?error=" +
        encodeURIComponent("Signalement introuvable."),
    );
  }
  if (
    report.status === ReportStatus.RESOLVED ||
    report.status === ReportStatus.DISMISSED
  ) {
    redirect(
      "/admin/signalements?success=" +
        encodeURIComponent("Signalement déjà traité."),
    );
  }

  const newStatus = dismiss ? ReportStatus.DISMISSED : ReportStatus.RESOLVED;
  const action = dismiss ? "dismissed" : resolution || "resolved";

  await prisma.report.update({
    where: { id: report.id },
    data: {
      status: newStatus,
      reviewedAt: new Date(),
      reviewedBy: admin.id,
      action,
    },
  });

  await logAdminAction({
    adminId: admin.id,
    action: dismiss
      ? AdminActionType.DISMISS_REPORT
      : AdminActionType.RESOLVE_REPORT,
    targetType: AdminTargetType.REPORT,
    targetId: report.id,
    reason: resolution || null,
    metadata: {
      reportReason: report.reason,
      targetUserId: report.reportedUserId,
      targetDealId: report.dealId,
      targetListingId: report.listingId,
      targetCommentId: report.commentId,
    },
  });

  revalidatePath("/admin/signalements");
  revalidatePath("/admin");
  redirect(
    "/admin/signalements?success=" +
      encodeURIComponent(dismiss ? "Signalement rejeté." : "Signalement résolu."),
  );
}
