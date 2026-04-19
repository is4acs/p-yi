"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireActiveUser } from "@/lib/auth/current-user";
import { requestPayout } from "@/lib/affiliate/payout";

/**
 * Server action qui traite la demande de paiement depuis la page
 * `/profil/affiliation`. Le montant demandé correspond toujours à
 * l'intégralité du solde dû — pas de saisie libre pour l'instant (évite
 * les erreurs et simplifie la compta).
 */
export async function requestPayoutAction(formData: FormData): Promise<void> {
  const user = await requireActiveUser("/profil/affiliation");

  const rawAmount = formData.get("amountCents");
  const amountCents =
    typeof rawAmount === "string" ? parseInt(rawAmount, 10) : NaN;

  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    redirect(
      `/profil/affiliation?error=${encodeURIComponent("Montant invalide.")}`,
    );
  }

  try {
    await requestPayout(user.id, amountCents);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Impossible de demander le paiement.";
    redirect(`/profil/affiliation?error=${encodeURIComponent(msg)}`);
  }

  revalidatePath("/profil/affiliation");
  redirect(
    `/profil/affiliation?success=${encodeURIComponent("Demande de paiement enregistrée. Tu recevras un virement sous quelques jours.")}`,
  );
}
