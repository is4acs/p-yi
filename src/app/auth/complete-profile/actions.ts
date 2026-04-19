"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";
import { completeProfileSchema } from "@/lib/validation/auth";
import { attributeReferralOnSignup } from "@/lib/affiliate/attribute";

const DEFAULT_CITY_SLUG = "cayenne";

function redirectWithError(message: string): never {
  redirect(`/auth/complete-profile?error=${encodeURIComponent(message)}`);
}

export async function completeProfileAction(formData: FormData) {
  const parsed = completeProfileSchema.safeParse({
    username: formData.get("username"),
  });

  if (!parsed.success) {
    redirectWithError(parsed.error.issues[0]?.message ?? "Pseudo invalide.");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser || !authUser.email) {
    redirect("/connexion");
  }

  const { username } = parsed.data;

  const existing = await prisma.user.findFirst({
    where: { username: { equals: username, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) {
    redirectWithError("Ce pseudo est déjà pris.");
  }

  const metadata = (authUser.user_metadata ?? {}) as {
    full_name?: string;
    avatar_url?: string;
  };

  const defaultCity = await prisma.city.findUnique({
    where: { slug: DEFAULT_CITY_SLUG },
    select: { id: true },
  });

  const upserted = await prisma.user.upsert({
    where: { id: authUser.id },
    update: { username },
    create: {
      id: authUser.id,
      email: authUser.email,
      username,
      fullName: metadata.full_name ?? null,
      avatarUrl: metadata.avatar_url ?? null,
      cityId: defaultCity?.id ?? null,
    },
  });

  // Mirror username into Supabase metadata so future ensureUserProfile calls
  // can pick it up without re-querying Prisma.
  const admin = createSupabaseAdminClient();
  await admin.auth.admin.updateUserById(authUser.id, {
    user_metadata: { ...authUser.user_metadata, username },
  });

  // Attribue le parrainage si un cookie `peyi_ref` est présent.
  // No-op silencieux sinon ; n'interrompt jamais le flow de signup.
  await attributeReferralOnSignup(upserted.id);

  redirect("/bons-plans");
}
