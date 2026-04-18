"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/auth/current-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizePhone } from "@/lib/auth/phone";
import {
  removeAvatarImage,
  uploadAvatarImage,
} from "@/lib/storage/avatars";
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
    const supabase = createSupabaseServerClient();
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
 * Upload (or replace) the current user's avatar. Expects `avatar` on the
 * FormData. The previous avatar blob is deleted best-effort so we don't
 * leave orphans in the `avatars` bucket.
 */
export async function updateAvatarAction(formData: FormData): Promise<void> {
  const user = await requireActiveUser("/profil/edit");

  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    redirectWithError("/profil/edit", "Choisis une image avant d'envoyer.");
  }

  let newUrl: string;
  try {
    newUrl = await uploadAvatarImage(file, user.id);
  } catch (err) {
    redirectWithError(
      "/profil/edit",
      err instanceof Error ? err.message : "Échec de l'upload.",
    );
  }

  const previousUrl = user.avatarUrl;

  await prisma.user.update({
    where: { id: user.id },
    data: { avatarUrl: newUrl },
  });

  if (previousUrl) {
    await removeAvatarImage(previousUrl);
  }

  revalidatePath("/profil");
  revalidatePath("/profil/edit");

  redirectWithSuccess("/profil", "Photo de profil mise à jour.");
}

/**
 * Removes the current user's avatar. Clears the Prisma row first (so the
 * UI updates immediately) and best-effort deletes the storage blob.
 */
export async function removeAvatarAction(): Promise<void> {
  const user = await requireActiveUser("/profil/edit");

  if (!user.avatarUrl) {
    redirect("/profil");
  }

  const previousUrl = user.avatarUrl;

  await prisma.user.update({
    where: { id: user.id },
    data: { avatarUrl: null },
  });

  await removeAvatarImage(previousUrl);

  revalidatePath("/profil");
  revalidatePath("/profil/edit");

  redirectWithSuccess("/profil", "Photo de profil supprimée.");
}
