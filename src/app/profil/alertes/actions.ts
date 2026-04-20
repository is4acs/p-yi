"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/auth/current-user";
import { writeLimiter } from "@/lib/rate-limit";
import { alertFormSchema } from "@/lib/validation/alert";

/**
 * CRUD alertes user. On limite volontairement :
 *   - cap 20 alertes/user : au-delà, c'est du spam volontaire ou un bug.
 *     Chaque alerte fanout = 1 push + 1 email par match, donc un user qui
 *     en aurait 500 pourrait générer un tsunami de notifs à chaque publi.
 *   - writeLimiter (10/min user) sur create/update/delete : défense anti-bot.
 *
 * Les toggles `notifyEmail/notifyPush/notifySms` du model Alert ne sont pas
 * encore consommés par dispatchNotification (qui lit User.notificationSettings).
 * On les laisse sur leurs défauts Prisma pour ne pas exposer un réglage qui
 * ne fonctionnerait pas. À câbler dans une passe ultérieure côté dispatch.
 */

const MAX_ALERTS_PER_USER = 20;

function redirectWithError(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function redirectWithSuccess(path: string, message: string): never {
  redirect(`${path}?success=${encodeURIComponent(message)}`);
}

async function parseForm(formData: FormData) {
  return alertFormSchema.safeParseAsync({
    name: formData.get("name"),
    keywordsRaw: formData.get("keywords"),
    type: formData.get("type"),
    categoryId: formData.get("categoryId"),
    cityId: formData.get("cityId"),
    minPrice: formData.get("minPrice"),
    maxPrice: formData.get("maxPrice"),
  });
}

export async function createAlertAction(formData: FormData): Promise<void> {
  const user = await requireActiveUser("/profil/alertes");

  const { success } = await writeLimiter.limit(user.id);
  if (!success) {
    redirectWithError(
      "/profil/alertes/nouveau",
      "Trop d'actions. Réessaye dans une minute.",
    );
  }

  const parsed = await parseForm(formData);
  if (!parsed.success) {
    redirectWithError(
      "/profil/alertes/nouveau",
      parsed.error.issues[0]?.message ?? "Formulaire invalide.",
    );
  }

  const count = await prisma.alert.count({ where: { userId: user.id } });
  if (count >= MAX_ALERTS_PER_USER) {
    redirectWithError(
      "/profil/alertes",
      `Tu as atteint la limite de ${MAX_ALERTS_PER_USER} alertes. Supprime-en une pour en créer une nouvelle.`,
    );
  }

  const v = parsed.data;
  await prisma.alert.create({
    data: {
      userId: user.id,
      name: v.name,
      keywords: v.keywordsRaw,
      type: v.type,
      categoryId: v.categoryId ?? null,
      cityId: v.cityId ?? null,
      minPrice: v.minPrice ?? null,
      maxPrice: v.maxPrice ?? null,
    },
  });

  revalidatePath("/profil/alertes");
  redirectWithSuccess("/profil/alertes", "Alerte créée.");
}

export async function updateAlertAction(formData: FormData): Promise<void> {
  const user = await requireActiveUser("/profil/alertes");

  const { success } = await writeLimiter.limit(user.id);
  if (!success) {
    redirectWithError(
      "/profil/alertes",
      "Trop d'actions. Réessaye dans une minute.",
    );
  }

  const id = formData.get("id");
  if (typeof id !== "string" || id.length === 0) {
    redirectWithError("/profil/alertes", "Alerte introuvable.");
  }

  const existing = await prisma.alert.findUnique({
    where: { id },
    select: { userId: true },
  });
  if (!existing || existing.userId !== user.id) {
    redirectWithError("/profil/alertes", "Alerte introuvable.");
  }

  const parsed = await parseForm(formData);
  if (!parsed.success) {
    redirectWithError(
      `/profil/alertes/${id}/modifier`,
      parsed.error.issues[0]?.message ?? "Formulaire invalide.",
    );
  }

  const v = parsed.data;
  await prisma.alert.update({
    where: { id },
    data: {
      name: v.name,
      keywords: v.keywordsRaw,
      type: v.type,
      categoryId: v.categoryId ?? null,
      cityId: v.cityId ?? null,
      minPrice: v.minPrice ?? null,
      maxPrice: v.maxPrice ?? null,
    },
  });

  revalidatePath("/profil/alertes");
  redirectWithSuccess("/profil/alertes", "Alerte mise à jour.");
}

export async function deleteAlertAction(formData: FormData): Promise<void> {
  const user = await requireActiveUser("/profil/alertes");

  const { success } = await writeLimiter.limit(user.id);
  if (!success) {
    redirectWithError(
      "/profil/alertes",
      "Trop d'actions. Réessaye dans une minute.",
    );
  }

  const id = formData.get("id");
  if (typeof id !== "string" || id.length === 0) {
    redirectWithError("/profil/alertes", "Alerte introuvable.");
  }

  // deleteMany + filter userId : on évite la course "findUnique puis delete"
  // et on retourne count=0 silencieusement si l'alerte ne nous appartient pas.
  const result = await prisma.alert.deleteMany({
    where: { id, userId: user.id },
  });
  if (result.count === 0) {
    redirectWithError("/profil/alertes", "Alerte introuvable.");
  }

  revalidatePath("/profil/alertes");
  redirectWithSuccess("/profil/alertes", "Alerte supprimée.");
}

export async function toggleAlertAction(formData: FormData): Promise<void> {
  const user = await requireActiveUser("/profil/alertes");

  const { success } = await writeLimiter.limit(user.id);
  if (!success) {
    redirectWithError(
      "/profil/alertes",
      "Trop d'actions. Réessaye dans une minute.",
    );
  }

  const id = formData.get("id");
  const nextActive = formData.get("active") === "1";
  if (typeof id !== "string" || id.length === 0) {
    redirectWithError("/profil/alertes", "Alerte introuvable.");
  }

  const result = await prisma.alert.updateMany({
    where: { id, userId: user.id },
    data: { isActive: nextActive },
  });
  if (result.count === 0) {
    redirectWithError("/profil/alertes", "Alerte introuvable.");
  }

  revalidatePath("/profil/alertes");
  redirect("/profil/alertes");
}
