"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { authLimiter, getClientIp } from "@/lib/rate-limit";
import { getSiteUrl } from "@/lib/site-url";
import { requestPasswordResetSchema } from "@/lib/validation/auth";

/**
 * Envoie un email de réinitialisation de mot de passe via Supabase.
 *
 * Flux :
 *   1. L'utilisateur saisit son e-mail sur /connexion/mot-de-passe-oublie.
 *   2. Supabase lui envoie un mail contenant un magic link qui pointe sur
 *      `{{ .SiteURL }}/auth/confirm?token_hash=…&type=recovery&next=/auth/reset-password`
 *      (le template "Reset Password" du dashboard Supabase doit être aligné
 *      sur ce format — identique à la confirmation d'inscription).
 *   3. Le clic transite par `/auth/confirm` qui verifyOtp + pose la session,
 *      puis redirige sur `/auth/reset-password`.
 *   4. L'utilisateur saisit son nouveau mot de passe (updateUser).
 *
 * Sécurité :
 *   - Rate limit IP (authLimiter 5/10 min) pour éviter le flood d'emails.
 *   - Message identique en cas de succès OU d'e-mail inconnu : on ne
 *     confirme jamais l'existence d'un compte (anti-énumération).
 */
function redirectWithError(message: string): never {
  redirect(
    `/connexion/mot-de-passe-oublie?error=${encodeURIComponent(message)}`,
  );
}

function formatRateLimitMessage(reset: number): string {
  const secondsLeft = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
  if (secondsLeft >= 60) {
    return `Trop de tentatives. Réessaye dans ${Math.ceil(secondsLeft / 60)} min.`;
  }
  return `Trop de tentatives. Réessaye dans ${secondsLeft}s.`;
}

export async function requestPasswordResetAction(formData: FormData) {
  const { success, reset } = await authLimiter.limit(await getClientIp());
  if (!success) {
    redirectWithError(formatRateLimitMessage(reset));
  }

  const parsed = requestPasswordResetSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    redirectWithError(
      parsed.error.issues[0]?.message ?? "Formulaire invalide.",
    );
  }

  const { email } = parsed.data;
  const supabase = await createSupabaseServerClient();

  // Le `redirectTo` est utilisé par Supabase comme base de l'URL dans
  // l'email. Supabase y append `?token_hash=…&type=recovery` — la route
  // /auth/confirm vérifie ensuite l'OTP et redirige vers `next`.
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getSiteUrl()}/auth/confirm?next=/auth/reset-password`,
  });

  if (error) {
    // On logge côté serveur mais on ne fuit pas l'info à l'utilisateur —
    // on affiche le même message "email envoyé" quoi qu'il arrive pour
    // éviter de confirmer qu'un email est inscrit dans la base.
    console.error("[resetPasswordForEmail] failed:", error);
  }

  redirect("/connexion/mot-de-passe-oublie?sent=1");
}
