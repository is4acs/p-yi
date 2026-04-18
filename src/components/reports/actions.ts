"use server";

import { revalidatePath } from "next/cache";
import { ReportReason } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/current-user";
import { reportLimiter } from "@/lib/rate-limit";

const ALLOWED_REASONS = new Set<ReportReason>([
  ReportReason.SCAM,
  ReportReason.DUPLICATE,
  ReportReason.OFFENSIVE,
  ReportReason.FAKE_PRICE,
  ReportReason.EXPIRED,
  ReportReason.WRONG_CATEGORY,
  ReportReason.SPAM,
  ReportReason.ILLEGAL,
  ReportReason.OTHER,
]);

type TargetKind = "listing" | "deal" | "comment" | "user";

export type CreateReportResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Créer un signalement utilisateur → modération.
 *
 * Rate-limit : 5 reports / heure / userId. Protège la queue /admin
 * /signalements contre un utilisateur malveillant qui flooderait.
 *
 * Anti-doublon : on rejette silencieusement (ok: true) un second
 * signalement du même reporter sur la même cible dans les 24h. Ça
 * évite à la fois le spam et de frustrer l'utilisateur qui cliquerait
 * deux fois.
 *
 * On ne vérifie pas que la cible existe encore en base avant de
 * signaler — si elle vient d'être supprimée, c'est qu'un modérateur a
 * déjà agi, le report reste utile comme trace historique.
 */
export async function createReportAction(formData: FormData): Promise<CreateReportResult> {
  const user = await requireUser();

  const { success } = await reportLimiter.limit(`report:${user.id}`);
  if (!success) {
    return {
      ok: false,
      error: "Trop de signalements envoyés récemment. Réessaye dans une heure.",
    };
  }

  const reasonRaw = String(formData.get("reason") ?? "");
  const description = String(formData.get("description") ?? "").trim() || null;
  const kind = String(formData.get("kind") ?? "") as TargetKind;
  const targetId = String(formData.get("targetId") ?? "").trim();

  if (!ALLOWED_REASONS.has(reasonRaw as ReportReason)) {
    return { ok: false, error: "Raison invalide." };
  }
  if (!targetId) {
    return { ok: false, error: "Cible invalide." };
  }
  if (description && description.length > 1000) {
    return {
      ok: false,
      error: "Description trop longue (1000 caractères max).",
    };
  }

  const reason = reasonRaw as ReportReason;

  // Déterminer la colonne FK selon le type + garde-fou interdire
  // l'auto-signalement (un user qui se signale lui-même, ou un auteur
  // qui signale son propre contenu — ce dernier est un bruit
  // probable).
  const data: {
    reporterId: string;
    reason: ReportReason;
    description: string | null;
    listingId?: string;
    dealId?: string;
    commentId?: string;
    reportedUserId?: string;
  } = {
    reporterId: user.id,
    reason,
    description,
  };

  if (kind === "listing") {
    const listing = await prisma.listing.findUnique({
      where: { id: targetId },
      select: { id: true, authorId: true },
    });
    if (!listing) return { ok: false, error: "Annonce introuvable." };
    if (listing.authorId === user.id) {
      return { ok: false, error: "Tu ne peux pas te signaler toi-même." };
    }
    data.listingId = listing.id;
  } else if (kind === "deal") {
    const deal = await prisma.deal.findUnique({
      where: { id: targetId },
      select: { id: true, authorId: true },
    });
    if (!deal) return { ok: false, error: "Bon plan introuvable." };
    if (deal.authorId === user.id) {
      return { ok: false, error: "Tu ne peux pas te signaler toi-même." };
    }
    data.dealId = deal.id;
  } else if (kind === "comment") {
    const comment = await prisma.comment.findUnique({
      where: { id: targetId },
      select: { id: true, authorId: true },
    });
    if (!comment) return { ok: false, error: "Commentaire introuvable." };
    if (comment.authorId === user.id) {
      return { ok: false, error: "Tu ne peux pas te signaler toi-même." };
    }
    data.commentId = comment.id;
  } else if (kind === "user") {
    if (targetId === user.id) {
      return { ok: false, error: "Tu ne peux pas te signaler toi-même." };
    }
    const target = await prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true },
    });
    if (!target) return { ok: false, error: "Utilisateur introuvable." };
    data.reportedUserId = target.id;
  } else {
    return { ok: false, error: "Type de cible invalide." };
  }

  // Anti-doublon 24h : même reporter, même cible précise, peu importe
  // la raison. On ne bloque PAS explicitement — on retourne ok: true
  // pour éviter d'éduquer le spammeur sur nos règles.
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const existing = await prisma.report.findFirst({
    where: {
      reporterId: user.id,
      createdAt: { gte: twentyFourHoursAgo },
      ...(data.listingId && { listingId: data.listingId }),
      ...(data.dealId && { dealId: data.dealId }),
      ...(data.commentId && { commentId: data.commentId }),
      ...(data.reportedUserId && { reportedUserId: data.reportedUserId }),
    },
    select: { id: true },
  });
  if (existing) {
    return { ok: true };
  }

  await prisma.report.create({ data });

  // On incrémente le compteur reportCount sur la cible utilisateur
  // directe OU sur l'auteur du contenu signalé — c'est le signal que
  // les modérateurs verront en premier dans /admin/utilisateurs.
  if (data.reportedUserId) {
    await prisma.user.update({
      where: { id: data.reportedUserId },
      data: { reportCount: { increment: 1 } },
    });
  } else if (data.listingId) {
    const listing = await prisma.listing.findUnique({
      where: { id: data.listingId },
      select: { authorId: true },
    });
    if (listing) {
      await prisma.user.update({
        where: { id: listing.authorId },
        data: { reportCount: { increment: 1 } },
      });
    }
  } else if (data.dealId) {
    const deal = await prisma.deal.findUnique({
      where: { id: data.dealId },
      select: { authorId: true },
    });
    if (deal) {
      await prisma.user.update({
        where: { id: deal.authorId },
        data: { reportCount: { increment: 1 } },
      });
    }
  } else if (data.commentId) {
    const comment = await prisma.comment.findUnique({
      where: { id: data.commentId },
      select: { authorId: true },
    });
    if (comment) {
      await prisma.user.update({
        where: { id: comment.authorId },
        data: { reportCount: { increment: 1 } },
      });
    }
  }

  revalidatePath("/admin/signalements");
  revalidatePath("/admin");

  return { ok: true };
}
