import { redirect } from "next/navigation";
import type { User } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Returns the current Prisma User row, or null if not authenticated or the
 * profile has not been created yet (OAuth first login).
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  return prisma.user.findUnique({ where: { id: authUser.id } });
}

/**
 * Enforces authentication. Redirects to /connexion if not signed in, and
 * to /auth/complete-profile if the user exists in Supabase but has no
 * Prisma profile yet (OAuth first login). Returns the User row otherwise.
 */
export async function requireUser(nextPath?: string): Promise<User> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    const next = nextPath ? `?next=${encodeURIComponent(nextPath)}` : "";
    redirect(`/connexion${next}`);
  }

  const profile = await prisma.user.findUnique({ where: { id: authUser.id } });
  if (!profile) redirect("/auth/complete-profile");

  return profile;
}
