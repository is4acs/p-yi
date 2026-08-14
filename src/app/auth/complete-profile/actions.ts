"use server";

import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";
import { completeProfileSchema } from "@/lib/validation/auth";
import { attributeReferralOnSignup } from "@/lib/affiliate/attribute";
import { authLimiter, getClientIp } from "@/lib/rate-limit";
import {
  rateLimitedState,
  type AuthFormState,
} from "@/lib/auth/errors";
import { safeInternalPath } from "@/lib/safe-redirect";

const DEFAULT_CITY_SLUG = "cayenne";
const DEFAULT_DESTINATION = "/bons-plans";

/**
 * Dernière étape de création de compte (OAuth première connexion, ou
 * pseudo d'inscription pris entre-temps) : choisir un pseudo, créer la
 * ligne Prisma, puis reprendre le parcours là où il avait commencé
 * (`next` propagé par /auth/callback, /auth/confirm et signInAction).
 */
export async function completeProfileAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  // Même limiteur que le reste du parcours auth : l'action écrit en base
  // et sert d'oracle de disponibilité de pseudo — pas de test en boucle.
  const { success, reset } = await authLimiter.limit(await getClientIp());
  if (!success) return rateLimitedState(reset);

  const parsed = completeProfileSchema.safeParse({
    username: formData.get("username"),
  });
  if (!parsed.success) return { error: "invalid_form" };

  const next = safeInternalPath(
    typeof formData.get("next") === "string"
      ? String(formData.get("next"))
      : null,
    DEFAULT_DESTINATION,
  );

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
  if (existing && existing.id !== authUser.id) {
    return { error: "username_taken" };
  }

  const metadata = (authUser.user_metadata ?? {}) as {
    full_name?: string;
    avatar_url?: string;
  };

  const defaultCity = await prisma.city.findUnique({
    where: { slug: DEFAULT_CITY_SLUG },
    select: { id: true },
  });

  let profileId: string;
  try {
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
    profileId = upserted.id;
  } catch (err) {
    // Course sur la contrainte unique (le check ci-dessus est UX, pas
    // une garantie) : on redemande un pseudo au lieu de crasher.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return { error: "username_taken" };
    }
    throw err;
  }

  // Mirror username into Supabase metadata so future ensureUserProfile calls
  // can pick it up without re-querying Prisma. Best-effort : un échec ici
  // ne doit pas bloquer un signup par ailleurs réussi (la ligne Prisma
  // existe, ensureUserProfile la trouvera par id).
  try {
    const admin = createSupabaseAdminClient();
    await admin.auth.admin.updateUserById(authUser.id, {
      user_metadata: { ...authUser.user_metadata, username },
    });
  } catch (err) {
    console.error("[completeProfile] metadata mirror failed:", err);
  }

  // Attribue le parrainage si un cookie `peyi_ref` est présent.
  // No-op silencieux sinon ; n'interrompt jamais le flow de signup.
  await attributeReferralOnSignup(profileId);

  redirect(next);
}
