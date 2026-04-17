import { redirect } from "next/navigation";
import type { User } from "@prisma/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * If Supabase auth.users has a different email (because the user just
 * confirmed an email change) or a different verified phone, silently mirror
 * the change into our Prisma User row. Only writes when a drift is detected
 * so the cost is zero for the common path.
 */
async function syncAuthDriftToPrisma(
  prismaUser: User,
  authUser: SupabaseUser,
): Promise<User> {
  const patches: Partial<Pick<User, "email" | "phone" | "phoneVerified">> = {};

  if (authUser.email && authUser.email !== prismaUser.email) {
    patches.email = authUser.email;
  }

  // `phone_confirmed_at` is set by Supabase once the OTP is verified. We use
  // that as the source of truth for phoneVerified, and mirror auth.users.phone
  // into Prisma.
  const authPhone = authUser.phone ? `+${authUser.phone}` : null;
  const authPhoneVerified = Boolean(authUser.phone_confirmed_at);
  if (authPhone && authPhone !== prismaUser.phone) {
    patches.phone = authPhone;
  }
  if (authPhoneVerified !== prismaUser.phoneVerified) {
    patches.phoneVerified = authPhoneVerified;
  }

  if (Object.keys(patches).length === 0) return prismaUser;

  return prisma.user.update({
    where: { id: prismaUser.id },
    data: patches,
  });
}

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

  const profile = await prisma.user.findUnique({
    where: { id: authUser.id },
  });
  if (!profile) return null;

  return syncAuthDriftToPrisma(profile, authUser);
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

  return syncAuthDriftToPrisma(profile, authUser);
}
