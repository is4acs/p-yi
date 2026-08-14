"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { signInSchema, signUpSchema } from "@/lib/validation/auth";
import { ensureUserProfile } from "@/lib/auth/ensure-profile";
import {
  rateLimitedState,
  type AuthFormState,
} from "@/lib/auth/errors";
import { safeInternalPath } from "@/lib/safe-redirect";
import { getSiteUrl } from "@/lib/site-url";
import { authLimiter, getClientIp } from "@/lib/rate-limit";

/**
 * Actions du parcours connexion / inscription.
 *
 * Modèle `useActionState` : chaque action renvoie un `AuthFormState`
 * (code d'erreur typé, traduit côté client) au lieu de rediriger avec
 * un message en query string. Conséquences :
 *  - la saisie de l'utilisateur n'est plus perdue à chaque erreur
 *    (l'ancien redirect vidait tous les champs) ;
 *  - plus aucun texte libre injectable dans l'URL ;
 *  - les messages suivent la langue de l'interface.
 * Les SUCCÈS restent des `redirect()` (navigation réelle).
 */

/** Destination après connexion : `?next=` si sûr, sinon le flux bons plans. */
const DEFAULT_DESTINATION = "/bons-plans";

function nextFrom(formData: FormData): string {
  return safeInternalPath(
    typeof formData.get("next") === "string"
      ? String(formData.get("next"))
      : null,
    DEFAULT_DESTINATION,
  );
}

/** /auth/complete-profile en conservant la destination d'origine. */
function completeProfilePath(next: string): string {
  return next !== DEFAULT_DESTINATION
    ? `/auth/complete-profile?next=${encodeURIComponent(next)}`
    : "/auth/complete-profile";
}

export async function signInAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const next = nextFrom(formData);

  // Rate limit par IP — protège contre le brute force.
  const { success, reset } = await authLimiter.limit(await getClientIp());
  if (!success) return rateLimitedState(reset);

  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "invalid_form" };

  const { email, password } = parsed.data;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (error.code === "email_not_confirmed") {
      return { error: "email_unconfirmed" };
    }
    if (error.code === "invalid_credentials") {
      return { error: "invalid_credentials" };
    }
    // Code inconnu — log serveur pour diagnostic, message générique.
    console.error("[signInAction] unexpected error:", error);
    return { error: "signin_failed" };
  }

  const profile = await ensureUserProfile();
  if (!profile) {
    // Authentifié mais sans profil Prisma (OAuth première connexion,
    // pseudo pris entre-temps…) : on collecte un pseudo maintenant.
    redirect(completeProfilePath(next));
  }
  redirect(next);
}

export async function signUpAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const next = nextFrom(formData);

  const { success, reset } = await authLimiter.limit(await getClientIp());
  if (!success) return rateLimitedState(reset);

  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    username: formData.get("username"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "invalid_form" };

  const { email, username, password } = parsed.data;

  // Disponibilité du pseudo côté Prisma (auth.users n'a pas de username).
  // Check UX seulement : la vraie garantie est la contrainte unique +
  // le rattrapage P2002 dans ensureUserProfile (deux inscriptions
  // simultanées avec le même pseudo ne peuvent pas se bloquer).
  const existing = await prisma.user.findFirst({
    where: { username: { equals: username, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) return { error: "username_taken" };

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // `next` voyage jusque dans l'e-mail de confirmation : pour qu'il
      // soit honoré, le template Supabase « Confirm signup » doit
      // pointer sur {{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=signup
      // (sinon Supabase garde son next statique et l'utilisateur repart
      // sur /bons-plans — fonctionnel mais moins fin).
      emailRedirectTo: `${getSiteUrl()}/auth/confirm?next=${encodeURIComponent(next)}`,
      data: { username },
    },
  });

  if (error) {
    if (error.message === "User already registered") {
      return { error: "email_taken" };
    }
    console.error("[signUpAction] unexpected error:", error);
    return { error: "signup_failed" };
  }

  // Supabase configuré avec « Confirm email = OFF » : session immédiate.
  if (data?.session) {
    const profile = await ensureUserProfile();
    if (!profile) redirect(completeProfilePath(next));
    redirect(next);
  }

  // Confirm email = ON : le formulaire affiche la bannière « vérifie ta
  // boîte mail » sans navigation (la saisie reste visible).
  return { error: null, sent: true };
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  // `scope: "local"` : on déconnecte CE navigateur, pas tous les
  // appareils de l'utilisateur (le défaut supabase-js est "global" —
  // surprenant pour un simple bouton « Se déconnecter »).
  await supabase.auth.signOut({ scope: "local" });
  redirect("/");
}
