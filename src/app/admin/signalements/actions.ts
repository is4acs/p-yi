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

/**
 * Traitement en lot : résout (ou rejette) plusieurs signalements en une
 * seule submit. Utile quand 20 reports arrivent pour le même deal
 * spam — sans ça le modérateur se tape 20 formulaires.
 *
 * Contract :
 *   - `reportIds` : plusieurs champs du même nom, FormData.getAll() gère
 *   - `dismiss` : "1" pour tout rejeter, sinon on résout avec `resolution`
 *   - `resolution` : texte libre réutilisé pour chacun (ex. "deal spam
 *     supprimé"). Chaque report a sa propre ligne dans AdminActionLog.
 *
 * Erreurs :
 *   - Si 0 report sélectionné, on redirect avec error mais on ne throw
 *     pas (UX : le modérateur voit "rien sélectionné").
 *   - Si un report est déjà traité entre-temps (race), on skip
 *     silencieusement et on compte dans le total traité.
 */
export async function adminBulkResolveReportsAction(formData: FormData) {
  const admin = await requireRole(UserRole.MODERATOR, "/admin/signalements");

  const reportIds = formData
    .getAll("reportIds")
    .map((v) => String(v))
    .filter(Boolean);
  const resolution = String(formData.get("resolution") ?? "").trim();
  const dismiss = formData.get("dismiss") === "1";

  if (reportIds.length === 0) {
    redirect(
      "/admin/signalements?error=" +
        encodeURIComponent("Aucun signalement sélectionné."),
    );
  }

  const reports = await prisma.report.findMany({
    where: {
      id: { in: reportIds },
      status: { in: [ReportStatus.PENDING, ReportStatus.REVIEWING] },
    },
    select: {
      id: true,
      reason: true,
      reportedUserId: true,
      dealId: true,
      listingId: true,
      commentId: true,
    },
  });

  if (reports.length === 0) {
    redirect(
      "/admin/signalements?success=" +
        encodeURIComponent("Signalements déjà traités."),
    );
  }

  const newStatus = dismiss ? ReportStatus.DISMISSED : ReportStatus.RESOLVED;
  const action = dismiss ? "dismissed" : resolution || "resolved";
  const now = new Date();

  // UpdateMany d'abord (un seul round-trip DB), puis log individuel
  // — on garde la granularité d'audit : 1 ligne AdminActionLog par
  // signalement traité, pas 1 ligne pour toute la bulk op.
  await prisma.report.updateMany({
    where: { id: { in: reports.map((r) => r.id) } },
    data: { status: newStatus, reviewedAt: now, reviewedBy: admin.id, action },
  });

  await Promise.all(
    reports.map((report) =>
      logAdminAction({
        adminId: admin.id,
        action: dismiss
          ? AdminActionType.DISMISS_REPORT
          : AdminActionType.RESOLVE_REPORT,
        targetType: AdminTargetType.REPORT,
        targetId: report.id,
        reason: resolution || null,
        metadata: {
          bulk: true,
          reportReason: report.reason,
          targetUserId: report.reportedUserId,
          targetDealId: report.dealId,
          targetListingId: report.listingId,
          targetCommentId: report.commentId,
        },
      }),
    ),
  );

  revalidatePath("/admin/signalements");
  revalidatePath("/admin");
  redirect(
    "/admin/signalements?success=" +
      encodeURIComponent(
        `${reports.length} signalement${reports.length > 1 ? "s" : ""} ${
          dismiss ? "rejeté" : "résolu"
        }${reports.length > 1 ? "s" : ""}.`,
      ),
  );
}
