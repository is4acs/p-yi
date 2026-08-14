"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { authLimiter, getClientIp } from "@/lib/rate-limit";
import { getSiteUrl } from "@/lib/site-url";
import { requestPasswordResetSchema } from "@/lib/validation/auth";
import {
  rateLimitedState,
  type AuthFormState,
} from "@/lib/auth/errors";

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
 *   - État `sent` identique en cas de succès OU d'e-mail inconnu : on ne
 *     confirme jamais l'existence d'un compte (anti-énumération).
 */
export async function requestPasswordResetAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const { success, reset } = await authLimiter.limit(await getClientIp());
  if (!success) return rateLimitedState(reset);

  const parsed = requestPasswordResetSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) return { error: "invalid_form" };

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
    // même état "envoyé" quoi qu'il arrive pour éviter de confirmer
    // qu'un email est inscrit dans la base.
    console.error("[resetPasswordForEmail] failed:", error);
  }

  return { error: null, sent: true };
}
