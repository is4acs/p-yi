import {
  AffiliatePayoutStatus,
  NotificationType,
  type AffiliatePayout,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { dispatchNotification } from "@/lib/notifications/dispatch";
import { logger } from "@/lib/log";

import { formatCents } from "./tiers";

/**
 * Crée une demande de paiement pour un parrain. Déplace `pendingPayoutCents`
 * vers `AffiliatePayout` en status PENDING — l'admin verra la ligne dans
 * l'onglet paiements et pourra la marquer PAID après le virement.
 *
 * Règles :
 *  - Le montant demandé ne peut pas excéder `pendingPayoutCents`
 *  - Seuil minimum : 20 € (sinon on cumule)
 *  - Si `isBanned` = true → impossible
 *
 * Throw si les garde-fous ne sont pas respectés (l'appelant — UI ou
 * action admin — gère le message utilisateur).
 */
export const MIN_PAYOUT_REQUEST_CENTS = 2000;

export async function requestPayout(
  userId: string,
  amountCents: number,
): Promise<AffiliatePayout> {
  if (amountCents < MIN_PAYOUT_REQUEST_CENTS) {
    throw new Error(
      `Montant minimum : ${formatCents(MIN_PAYOUT_REQUEST_CENTS)}`,
    );
  }

  const profile = await prisma.affiliateProfile.findUnique({
    where: { userId },
  });
  if (!profile) throw new Error("Pas de profil d'affiliation.");
  if (profile.isBanned) throw new Error("Compte d'affiliation suspendu.");
  if (amountCents > profile.pendingPayoutCents) {
    throw new Error(
      `Solde insuffisant (${formatCents(profile.pendingPayoutCents)} disponible).`,
    );
  }

  return prisma.$transaction(async (tx) => {
    const payout = await tx.affiliatePayout.create({
      data: {
        userId,
        amountCents,
        tierReached: profile.tierReached,
      },
    });

    await tx.affiliateProfile.update({
      where: { id: profile.id },
      data: { pendingPayoutCents: { decrement: amountCents } },
    });

    return payout;
  });
}

/**
 * Passe un paiement en PAID (admin only). Enregistre la date de versement
 * et notifie le parrain. On déplace le montant de `pendingPayoutCents`
 * (déjà décrémenté à la demande) vers `paidOutCents` pour garder la
 * traçabilité comptable.
 */
export async function markPayoutPaid(
  payoutId: string,
  params: { method?: string; reference?: string; notes?: string },
): Promise<AffiliatePayout> {
  const payout = await prisma.affiliatePayout.findUnique({
    where: { id: payoutId },
  });
  if (!payout) throw new Error("Paiement introuvable.");
  if (payout.status !== AffiliatePayoutStatus.PENDING &&
      payout.status !== AffiliatePayoutStatus.PROCESSING) {
    throw new Error("Ce paiement a déjà été traité.");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.affiliatePayout.update({
      where: { id: payoutId },
      data: {
        status: AffiliatePayoutStatus.PAID,
        paidAt: new Date(),
        method: params.method ?? null,
        reference: params.reference ?? null,
        notes: params.notes ?? null,
      },
    });

    await tx.affiliateProfile.update({
      where: { userId: payout.userId },
      data: { paidOutCents: { increment: payout.amountCents } },
    });

    return row;
  });

  // Notif hors transaction — pipeline unifié (in-app + push + email
  // selon les prefs du parrain). Si un canal tombe, la transaction
  // DB est déjà commit : aucun risque d'écriture fantôme.
  await dispatchNotification({
    userId: payout.userId,
    type: NotificationType.AFFILIATE_PAYOUT,
    title: "Paiement d'affiliation reçu 💸",
    message: `${formatCents(payout.amountCents)} viennent d'être versés${
      params.method ? ` (${params.method})` : ""
    }.`,
    actionPath: "/profil/affiliation",
  }).catch((err) => {
    logger.warn("affiliate.payout.dispatch.failed", {
      userId: payout.userId,
      err: err instanceof Error ? err.message : String(err),
    });
  });

  return updated;
}

/**
 * Rejette un paiement (fraude détectée, compte fermé, etc.). Ré-crédite
 * le `pendingPayoutCents` pour que l'argent soit récupérable ou
 * ultérieurement re-saisi si la décision change.
 */
export async function rejectPayout(
  payoutId: string,
  reason: string,
): Promise<AffiliatePayout> {
  const payout = await prisma.affiliatePayout.findUnique({
    where: { id: payoutId },
  });
  if (!payout) throw new Error("Paiement introuvable.");
  if (payout.status !== AffiliatePayoutStatus.PENDING &&
      payout.status !== AffiliatePayoutStatus.PROCESSING) {
    throw new Error("Ce paiement a déjà été traité.");
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.affiliatePayout.update({
      where: { id: payoutId },
      data: {
        status: AffiliatePayoutStatus.REJECTED,
        rejectedAt: new Date(),
        rejectionReason: reason,
      },
    });

    await tx.affiliateProfile.update({
      where: { userId: payout.userId },
      data: { pendingPayoutCents: { increment: payout.amountCents } },
    });

    return updated;
  });
}

/**
 * Génère un export CSV des paiements pour comptabilité / batch virement.
 * Colonnes : date de demande, user, email, montant €, status, méthode,
 * référence, date de versement.
 *
 * Les virgules et guillemets dans les champs texte sont escapés selon
 * RFC 4180 (guillemets doublés, champ entouré de guillemets).
 */
export async function exportPayoutsCsv(filter?: {
  status?: AffiliatePayoutStatus;
  since?: Date;
}): Promise<string> {
  const payouts = await prisma.affiliatePayout.findMany({
    where: {
      ...(filter?.status ? { status: filter.status } : {}),
      ...(filter?.since ? { requestedAt: { gte: filter.since } } : {}),
    },
    include: {
      user: {
        select: { email: true, username: true, fullName: true },
      },
    },
    orderBy: { requestedAt: "desc" },
  });

  const header = [
    "date_demande",
    "username",
    "email",
    "nom",
    "montant_eur",
    "devise",
    "status",
    "methode",
    "reference",
    "palier",
    "date_paiement",
    "notes",
  ].join(",");

  const rows = payouts.map((p) => {
    const fields = [
      p.requestedAt.toISOString(),
      p.user.username,
      p.user.email,
      p.user.fullName ?? "",
      (p.amountCents / 100).toFixed(2),
      p.currency,
      p.status,
      p.method ?? "",
      p.reference ?? "",
      p.tierReached?.toString() ?? "",
      p.paidAt?.toISOString() ?? "",
      p.notes ?? "",
    ];
    return fields.map(escapeCsv).join(",");
  });

  return [header, ...rows].join("\n");
}

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
