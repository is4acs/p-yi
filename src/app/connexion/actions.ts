"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { signInSchema, signUpSchema } from "@/lib/validation/auth";
import { ensureUserProfile } from "@/lib/auth/ensure-profile";
import { safeInternalPath } from "@/lib/safe-redirect";
import { getSiteUrl } from "@/lib/site-url";
import { authLimiter, getClientIp } from "@/lib/rate-limit";

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

/**
 * Renvoie sur /connexion en conservant le contexte : l'onglet en cours et
 * la destination d'origine. Sans ça, une erreur à l'inscription rebasculait
 * l'utilisateur sur l'onglet « Se connecter » (il perdait son pseudo saisi),
 * et la destination `?next=` était oubliée en route.
 */
function redirectWithError(
  message: string,
  options: { mode?: "signup"; next?: string } = {},
): never {
  const params = new URLSearchParams();
  if (options.mode) params.set("mode", options.mode);
  if (options.next && options.next !== DEFAULT_DESTINATION) {
    params.set("next", options.next);
  }
  params.set("error", message);
  redirect(`/connexion?${params.toString()}`);
}

function formatRateLimitMessage(reset: number): string {
  const secondsLeft = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
  if (secondsLeft >= 60) {
    return `Trop de tentatives. Réessaye dans ${Math.ceil(secondsLeft / 60)} min.`;
  }
  return `Trop de tentatives. Réessaye dans ${secondsLeft}s.`;
}

export async function signInAction(formData: FormData) {
  const next = nextFrom(formData);

  // Rate limit par IP — protège contre le brute force.
  const { success, reset } = await authLimiter.limit(await getClientIp());
  if (!success) {
    redirectWithError(formatRateLimitMessage(reset), { next });
  }

  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirectWithError(parsed.error.issues[0]?.message ?? "Formulaire invalide.", {
      next,
    });
  }

  const { email, password } = parsed.data;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Map common Supabase error codes to friendly French messages.
    if (error.code === "email_not_confirmed") {
      redirectWithError(
        "E-mail pas encore confirmé. Clique sur le lien reçu par mail.",
        { next },
      );
    }
    if (error.code === "invalid_credentials") {
      redirectWithError("E-mail ou mot de passe incorrect.", { next });
    }
    // Unknown code — log server-side for later diagnosis, show generic message.
    console.error("[signInAction] unexpected error:", error);
    redirectWithError("Connexion impossible. Réessaie.", { next });
  }

  const profile = await ensureUserProfile();
  if (!profile) {
    // User authenticated but has no Prisma profile yet (e.g. Supabase Dashboard
    // or OAuth first-login without `username` metadata). Collect one now.
    redirect("/auth/complete-profile");
  }
  redirect(next);
}

export async function signUpAction(formData: FormData) {
  const next = nextFrom(formData);

  const { success, reset } = await authLimiter.limit(await getClientIp());
  if (!success) {
    redirectWithError(formatRateLimitMessage(reset), { mode: "signup", next });
  }

  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirectWithError(parsed.error.issues[0]?.message ?? "Formulaire invalide.", {
      mode: "signup",
      next,
    });
  }

  const { email, username, password } = parsed.data;

  // Check username availability against Prisma (auth.users table has no username).
  const existing = await prisma.user.findFirst({
    where: { username: { equals: username, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) {
    redirectWithError("Ce pseudo est déjà pris.", { mode: "signup", next });
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${getSiteUrl()}/auth/confirm`,
      data: { username },
    },
  });

  if (error) {
    redirectWithError(
      error.message === "User already registered"
        ? "Cet e-mail est déjà utilisé."
        : "Impossible de créer le compte. Réessaie plus tard.",
      { mode: "signup", next },
    );
  }

  // If Supabase is configured with "Confirm email = OFF", signUp returns a
  // live session and the user is already logged in — go straight to the app.
  if (data?.session) {
    const profile = await ensureUserProfile();
    if (!profile) redirect("/auth/complete-profile");
    redirect(next);
  }

  const params = new URLSearchParams({ mode: "signup", confirmSent: "1" });
  if (next !== DEFAULT_DESTINATION) params.set("next", next);
  redirect(`/connexion?${params.toString()}`);
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
