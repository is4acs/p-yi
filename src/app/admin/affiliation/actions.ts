"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";

import { requireRole } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { markPayoutPaid, rejectPayout } from "@/lib/affiliate/payout";

function redirectWithError(message: string): never {
  redirect(`/admin/affiliation?error=${encodeURIComponent(message)}`);
}

function redirectWithSuccess(message: string): never {
  redirect(`/admin/affiliation?success=${encodeURIComponent(message)}`);
}

/**
 * Marque un paiement d'affiliation comme VERSÉ. L'admin saisit la méthode
 * (virement / Paypal / autre), la référence du virement, et éventuellement
 * une note libre. On notifie automatiquement le parrain.
 *
 * Réservé à un ADMIN ou plus — un modérateur standard ne doit pas toucher
 * aux paiements.
 */
export async function markPayoutPaidAction(formData: FormData): Promise<void> {
  await requireRole(UserRole.ADMIN, "/admin/affiliation");

  const payoutId = formData.get("payoutId");
  if (typeof payoutId !== "string" || !payoutId) {
    redirectWithError("Paiement introuvable.");
  }

  const method = (formData.get("method") as string | null)?.trim() || "BANK_TRANSFER";
  const reference = (formData.get("reference") as string | null)?.trim() || undefined;
  const notes = (formData.get("notes") as string | null)?.trim() || undefined;

  try {
    await markPayoutPaid(payoutId, { method, reference, notes });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur inconnue.";
    redirectWithError(msg);
  }

  revalidatePath("/admin/affiliation");
  redirectWithSuccess("Paiement marqué comme versé.");
}

/**
 * Rejette un paiement (fraude, compte fermé, litige). Ré-crédite
 * automatiquement le `pendingPayoutCents` du parrain pour conserver la
 * traçabilité.
 */
export async function rejectPayoutAction(formData: FormData): Promise<void> {
  await requireRole(UserRole.ADMIN, "/admin/affiliation");

  const payoutId = formData.get("payoutId");
  const reason = formData.get("reason");
  if (typeof payoutId !== "string" || !payoutId) {
    redirectWithError("Paiement introuvable.");
  }
  if (typeof reason !== "string" || reason.trim().length < 3) {
    redirectWithError("Une raison est requise (≥ 3 caractères).");
  }

  try {
    await rejectPayout(payoutId, reason.trim());
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur inconnue.";
    redirectWithError(msg);
  }

  revalidatePath("/admin/affiliation");
  redirectWithSuccess("Paiement rejeté et montant ré-crédité au parrain.");
}

/**
 * Bannit un profil d'affiliation (fraude avérée). Le compte utilisateur
 * normal n'est pas touché — seul son programme d'affiliation est
 * désactivé : plus de nouvelles qualifications, plus de paiements, le
 * lien continue de fonctionner pour l'UX mais n'attribue plus.
 */
export async function banAffiliateAction(formData: FormData): Promise<void> {
  await requireRole(UserRole.ADMIN, "/admin/affiliation");

  const profileId = formData.get("profileId");
  const reason = formData.get("reason");
  if (typeof profileId !== "string" || !profileId) {
    redirectWithError("Profil introuvable.");
  }
  if (typeof reason !== "string" || reason.trim().length < 3) {
    redirectWithError("Une raison est requise (≥ 3 caractères).");
  }

  await prisma.affiliateProfile.update({
    where: { id: profileId },
    data: { isBanned: true, banReason: reason.trim() },
  });

  revalidatePath("/admin/affiliation");
  redirectWithSuccess("Profil d'affiliation suspendu.");
}

/**
 * Ré-active un profil d'affiliation précédemment suspendu.
 */
export async function unbanAffiliateAction(formData: FormData): Promise<void> {
  await requireRole(UserRole.ADMIN, "/admin/affiliation");

  const profileId = formData.get("profileId");
  if (typeof profileId !== "string" || !profileId) {
    redirectWithError("Profil introuvable.");
  }

  await prisma.affiliateProfile.update({
    where: { id: profileId },
    data: { isBanned: false, banReason: null },
  });

  revalidatePath("/admin/affiliation");
  redirectWithSuccess("Profil réactivé.");
}
