"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { authLimiter, getClientIp } from "@/lib/rate-limit";
import { updatePasswordSchema } from "@/lib/validation/auth";

/**
 * Met à jour le mot de passe de l'utilisateur connecté. Cette action est
 * appelée après que `/auth/confirm` a validé l'OTP de recovery et posé la
 * session Supabase. Sans session, Supabase renvoie une erreur (on la mappe
 * vers un message humain).
 *
 * Sécurité :
 *   - Rate limit IP (authLimiter) pour couvrir le cas où un user légitime
 *     aurait son cookie de session volé : sans rate-limit, l'attaquant
 *     pourrait tenter de changer le mot de passe en boucle pour se
 *     verrouiller dedans.
 *   - Validation Zod (min 8 caractères) — identique au signUp.
 */
function redirectWithError(message: string): never {
  redirect(`/auth/reset-password?error=${encodeURIComponent(message)}`);
}

function formatRateLimitMessage(reset: number): string {
  const secondsLeft = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
  if (secondsLeft >= 60) {
    return `Trop de tentatives. Réessaye dans ${Math.ceil(secondsLeft / 60)} min.`;
  }
  return `Trop de tentatives. Réessaye dans ${secondsLeft}s.`;
}

export async function updatePasswordAction(formData: FormData) {
  const { success, reset } = await authLimiter.limit(await getClientIp());
  if (!success) {
    redirectWithError(formatRateLimitMessage(reset));
  }

  const parsed = updatePasswordSchema.safeParse({
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirectWithError(
      parsed.error.issues[0]?.message ?? "Mot de passe invalide.",
    );
  }

  const supabase = await createSupabaseServerClient();

  // Sans session active (cas où le lien a expiré ou déjà été consommé),
  // updateUser throw. On renvoie l'utilisateur vers le formulaire de
  // demande pour qu'il recommence.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(
      "/connexion/mot-de-passe-oublie?error=" +
        encodeURIComponent(
          "Lien expiré ou invalide. Demande un nouveau lien.",
        ),
    );
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    console.error("[updatePasswordAction] failed:", error);
    redirectWithError(
      error.message === "New password should be different from the old password."
        ? "Le nouveau mot de passe doit être différent de l'ancien."
        : "Impossible de mettre à jour le mot de passe. Réessaie.",
    );
  }

  redirect("/bons-plans?password-updated=1");
}
