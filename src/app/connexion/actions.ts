"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { signInSchema, signUpSchema } from "@/lib/validation/auth";
import { ensureUserProfile } from "@/lib/auth/ensure-profile";
import { getSiteUrl } from "@/lib/site-url";

function redirectWithError(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

export async function signInAction(formData: FormData) {
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
    redirectWithError("/connexion", "E-mail ou mot de passe incorrect.");
  }

  await ensureUserProfile();
  redirect("/bons-plans");
}

export async function signUpAction(formData: FormData) {
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
    await ensureUserProfile();
    redirect("/bons-plans");
  }

  redirect("/connexion?mode=signup&confirmSent=1");
}

export async function signOutAction() {
  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function signInWithGoogleAction() {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${getSiteUrl()}/auth/callback`,
    },
  });

  if (error || !data?.url) {
    redirectWithError(
      "/connexion",
      "Connexion Google indisponible pour le moment.",
    );
  }

  redirect(data.url);
}
