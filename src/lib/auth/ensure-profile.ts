import type { User } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const DEFAULT_CITY_SLUG = "cayenne";

/**
 * Guarantees that a Prisma `User` row exists for the currently authenticated
 * Supabase user. Returns the profile, or `null` if:
 *   - no Supabase session is active, or
 *   - the auth user has no username yet (OAuth first login → needs
 *     `/auth/complete-profile` later).
 *
 * Idempotent: calling it twice for the same auth user is safe (upsert).
 */
export async function ensureUserProfile(): Promise<User | null> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser || !authUser.email) return null;

  const existing = await prisma.user.findUnique({
    where: { id: authUser.id },
  });
  if (existing) return existing;

  const metadata = (authUser.user_metadata ?? {}) as {
    username?: string;
    full_name?: string;
    avatar_url?: string;
  };

  const username = metadata.username;
  if (!username) {
    // OAuth sign-up without a chosen username — defer creation.
    return null;
  }

  const defaultCity = await prisma.city.findUnique({
    where: { slug: DEFAULT_CITY_SLUG },
    select: { id: true },
  });

  return prisma.user.upsert({
    where: { id: authUser.id },
    update: {},
    create: {
      id: authUser.id,
      email: authUser.email,
      username,
      fullName: metadata.full_name ?? null,
      avatarUrl: metadata.avatar_url ?? null,
      cityId: defaultCity?.id ?? null,
    },
  });
}
