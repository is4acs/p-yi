"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { signInSchema, signUpSchema } from "@/lib/validation/auth";
import { ensureUserProfile } from "@/lib/auth/ensure-profile";
import { getSiteUrl } from "@/lib/site-url";
import { authLimiter, getClientIp } from "@/lib/rate-limit";

function redirectWithError(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function formatRateLimitMessage(reset: number): string {
  const secondsLeft = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
  if (secondsLeft >= 60) {
    return `Trop de tentatives. Réessaye dans ${Math.ceil(secondsLeft / 60)} min.`;
  }
  return `Trop de tentatives. Réessaye dans ${secondsLeft}s.`;
}

export async function signInAction(formData: FormData) {
  // Rate limit par IP — protège contre le brute force.
  const { success, reset } = await authLimiter.limit(getClientIp());
  if (!success) {
    redirectWithError("/connexion", formatRateLimitMessage(reset));
  }

  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirectWithError(
      "/connexion",
      parsed.error.issues[0]?.message ?? "Formulaire invalide.",
    );
  }

  const { email, password } = parsed.data;
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Map common Supabase error codes to friendly French messages.
    if (error.code === "email_not_confirmed") {
      redirectWithError(
        "/connexion",
        "E-mail pas encore confirmé. Clique sur le lien reçu par mail.",
      );
    }
    if (error.code === "invalid_credentials") {
      redirectWithError("/connexion", "E-mail ou mot de passe incorrect.");
    }
    // Unknown code — log server-side for later diagnosis, show generic message.
    console.error("[signInAction] unexpected error:", error);
    redirectWithError("/connexion", "Connexion impossible. Réessaie.");
  }

  const profile = await ensureUserProfile();
  if (!profile) {
    // User authenticated but has no Prisma profile yet (e.g. Supabase Dashboard
    // or OAuth first-login without `username` metadata). Collect one now.
    redirect("/auth/complete-profile");
  }
  redirect("/bons-plans");
}

export async function signUpAction(formData: FormData) {
  const { success, reset } = await authLimiter.limit(getClientIp());
  if (!success) {
    redirectWithError("/connexion?mode=signup", formatRateLimitMessage(reset));
  }

  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirectWithError(
      "/connexion?mode=signup",
      parsed.error.issues[0]?.message ?? "Formulaire invalide.",
    );
  }

  const { email, username, password } = parsed.data;

  // Check username availability against Prisma (auth.users table has no username).
  const existing = await prisma.user.findFirst({
    where: { username: { equals: username, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) {
    redirectWithError("/connexion?mode=signup", "Ce pseudo est déjà pris.");
  }

  const supabase = createSupabaseServerClient();

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
      "/connexion?mode=signup",
      error.message === "User already registered"
        ? "Cet e-mail est déjà utilisé."
        : "Impossible de créer le compte. Réessaie plus tard.",
    );
  }

  // If Supabase is configured with "Confirm email = OFF", signUp returns a
  // live session and the user is already logged in — go straight to the app.
  if (data?.session) {
    const profile = await ensureUserProfile();
    if (!profile) redirect("/auth/complete-profile");
    redirect("/bons-plans");
  }

  redirect("/connexion?mode=signup&confirmSent=1");
}

export async function signOutAction() {
  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
