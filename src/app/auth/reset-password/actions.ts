"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { authLimiter, getClientIp } from "@/lib/rate-limit";
import { updatePasswordSchema } from "@/lib/validation/auth";
import {
  rateLimitedState,
  type AuthFormState,
} from "@/lib/auth/errors";

/**
 * Met à jour le mot de passe de l'utilisateur connecté. Cette action est
 * appelée après que `/auth/confirm` a validé l'OTP de recovery et posé la
 * session Supabase. Sans session, on renvoie `link_invalid` — le
 * formulaire affiche un lien vers la demande d'un nouveau mail.
 *
 * Sécurité :
 *   - Rate limit IP (authLimiter) pour couvrir le cas où un user légitime
 *     aurait son cookie de session volé : sans rate-limit, l'attaquant
 *     pourrait tenter de changer le mot de passe en boucle pour se
 *     verrouiller dedans.
 *   - Validation Zod (min 8 caractères) — identique au signUp.
 */
export async function updatePasswordAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const { success, reset } = await authLimiter.limit(await getClientIp());
  if (!success) return rateLimitedState(reset);

  const parsed = updatePasswordSchema.safeParse({
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "invalid_form" };

  const supabase = await createSupabaseServerClient();

  // Sans session active (lien expiré ou déjà consommé), updateUser
  // échouerait de façon opaque — on donne l'issue claire.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "link_invalid" };

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    console.error("[updatePasswordAction] failed:", error);
    return {
      error:
        error.message ===
        "New password should be different from the old password."
          ? "password_same"
          : "update_failed",
    };
  }

  return { error: null, done: true };
}
