"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/auth/current-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizePhone } from "@/lib/auth/phone";
import { removeAvatarImage } from "@/lib/storage/avatars";
import {
  AVATAR_BUCKET,
  parseOwnedStorageUrl,
} from "@/lib/storage/signed-upload";
import { updateProfileSchema } from "@/lib/validation/profile";

function redirectWithError(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function redirectWithSuccess(path: string, message: string): never {
  redirect(`${path}?success=${encodeURIComponent(message)}`);
}

/**
 * Update the current user's profile.
 *
 *  - Username + fullName  → Prisma only.
 *  - Email change         → Supabase (sends confirmation link to NEW email).
 *                           The Prisma row is refreshed lazily by
 *                           `syncAuthDriftToPrisma` once the user confirms.
 *  - Phone change         → Supabase (sends SMS OTP via Twilio).
 *                           Redirects to /profil/verifier-telephone to enter
 *                           the code. `syncAuthDriftToPrisma` will flip
 *                           `phoneVerified` once the OTP is validated.
 *
 * Priority of redirects when several fields change at once :
 *   1. Phone needs OTP     → /profil/verifier-telephone
 *   2. Email needs confirm → /profil with a "check your inbox" toast
 *   3. Trivial only        → /profil with "Profil mis à jour"
 */
export async function updateProfileAction(formData: FormData): Promise<void> {
  const user = await requireActiveUser("/profil/edit");

  // Normalize the phone input before zod validates it.
  const rawPhone = formData.get("phone");
  const phoneInput = typeof rawPhone === "string" ? rawPhone.trim() : "";
  const normalizedPhone = phoneInput ? normalizePhone(phoneInput) : "";

  if (phoneInput && normalizedPhone === null) {
    redirectWithError(
      "/profil/edit",
      "Numéro de téléphone invalide. Exemple : 0694 12 34 56.",
    );
  }

  const parsed = updateProfileSchema.safeParse({
    username: formData.get("username"),
    fullName: formData.get("fullName") ?? undefined,
    email: formData.get("email"),
    phone: normalizedPhone ?? "",
  });

  if (!parsed.success) {
    redirectWithError(
      "/profil/edit",
      parsed.error.issues[0]?.message ?? "Formulaire invalide.",
    );
  }
  const data = parsed.data;

  // Uniqueness — username
  if (data.username !== user.username) {
    const taken = await prisma.user.findFirst({
      where: { username: data.username, NOT: { id: user.id } },
      select: { id: true },
    });
    if (taken) {
      redirectWithError("/profil/edit", "Ce pseudo est déjà pris.");
    }
  }

  // Uniqueness — phone (only if a new one was provided)
  const currentPhone = user.phone ?? "";
  const phoneChanged = data.phone !== currentPhone;
  if (data.phone && phoneChanged) {
    const taken = await prisma.user.findFirst({
      where: { phone: data.phone, NOT: { id: user.id } },
      select: { id: true },
    });
    if (taken) {
      redirectWithError(
        "/profil/edit",
        "Ce numéro est déjà associé à un autre compte.",
      );
    }
  }

  // Trivial updates go straight to Prisma.
  await prisma.user.update({
    where: { id: user.id },
    data: {
      username: data.username,
      fullName: data.fullName ?? null,
    },
  });

  // Special case : the user cleared their phone. Wipe it locally, don't
  // touch Supabase auth (keeps the identity in case they want to re-link).
  if (phoneChanged && !data.phone && currentPhone) {
    await prisma.user.update({
      where: { id: user.id },
      data: { phone: null, phoneVerified: false },
    });
  }

  const emailChanged = data.email !== user.email;

  const supabaseUpdates: { email?: string; phone?: string } = {};
  if (emailChanged) supabaseUpdates.email = data.email;
  if (phoneChanged && data.phone) supabaseUpdates.phone = data.phone;

  if (Object.keys(supabaseUpdates).length > 0) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.updateUser(supabaseUpdates);
    if (error) {
      console.error("[updateProfileAction] supabase updateUser failed", {
        message: error.message,
        code: (error as { code?: string }).code,
        status: (error as { status?: number }).status,
      });
      redirectWithError(
        "/profil/edit",
        `Mise à jour impossible : ${error.message}`,
      );
    }
  }

  revalidatePath("/profil");
  revalidatePath("/profil/edit");

  if (phoneChanged && data.phone) {
    redirect(
      `/profil/verifier-telephone?phone=${encodeURIComponent(data.phone)}`,
    );
  }

  if (emailChanged) {
    redirectWithSuccess(
      "/profil",
      "Profil mis à jour. Un lien de confirmation a été envoyé à ta nouvelle adresse e-mail.",
    );
  }

  redirectWithSuccess("/profil", "Profil mis à jour.");
}

/**
 * Finalise l'upload d'un avatar : le client a déjà compressé puis poussé
 * le blob vers Supabase Storage via une URL signée, et nous remonte la
 * `publicUrl`. On valide ici qu'elle pointe bien vers le bucket avatars
 * et le dossier de l'utilisateur courant (sécurité = pas d'usurpation
 * d'image d'autrui), on met à jour la DB, puis on supprime best-effort
 * l'ancienne photo pour éviter les orphelins.
 *
 * Renvoie la nouvelle URL au client (pour optimistic UI) au lieu de
 * rediriger : le composant fait `router.refresh()` lui-même, ce qui est
 * plus fluide qu'un full reload de la page d'édition.
 */
export type FinalizeAvatarResult =
  | { ok: true; avatarUrl: string }
  | { ok: false; error: string };

export async function finalizeAvatarUploadAction(
  publicUrl: string,
): Promise<FinalizeAvatarResult> {
  const user = await requireActiveUser("/profil/edit");

  if (typeof publicUrl !== "string" || publicUrl.length === 0) {
    return { ok: false, error: "Aucune image reçue." };
  }

  const parsed = parseOwnedStorageUrl(publicUrl, AVATAR_BUCKET, user.id);
  if (!parsed) {
    return {
      ok: false,
      error: "Cette image ne provient pas de ton dossier d'avatars.",
    };
  }

  const previousUrl = user.avatarUrl;

  await prisma.user.update({
    where: { id: user.id },
    data: { avatarUrl: publicUrl },
  });

  if (previousUrl && previousUrl !== publicUrl) {
    await removeAvatarImage(previousUrl);
  }

  revalidatePath("/profil");
  revalidatePath("/profil/edit");

  return { ok: true, avatarUrl: publicUrl };
}

/**
 * Supprime l'avatar courant. Comme `finalizeAvatarUploadAction`, retourne
 * un résultat plutôt qu'une redirection — le composant client gère lui-même
 * le rafraîchissement RSC pour une UX plus fluide.
 */
export type RemoveAvatarResult =
  | { ok: true }
  | { ok: false; error: string };

export async function removeAvatarAction(): Promise<RemoveAvatarResult> {
  const user = await requireActiveUser("/profil/edit");

  if (!user.avatarUrl) {
    return { ok: true };
  }

  const previousUrl = user.avatarUrl;

  await prisma.user.update({
    where: { id: user.id },
    data: { avatarUrl: null },
  });

  await removeAvatarImage(previousUrl);

  revalidatePath("/profil");
  revalidatePath("/profil/edit");

  return { ok: true };
}
