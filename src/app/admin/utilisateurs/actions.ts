"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AdminActionType, AdminTargetType, UserRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/current-user";
import { logAdminAction } from "@/lib/admin/log";
import { ROLE_RANK } from "@/lib/auth/current-user";

/**
 * Bannir un utilisateur (MODERATOR+). On refuse net de bannir un
 * compte dont le rôle est >= au nôtre — un modérateur ne peut pas
 * bannir un admin, un admin ne peut pas bannir un super-admin.
 *
 * Le paramètre `days` est optionnel : sans durée, le ban est permanent
 * (bannedUntil = null, isBanned = true). On peut aussi reset avec 0
 * jours → ban permanent explicite.
 */
export async function adminBanUserAction(formData: FormData) {
  const admin = await requireRole(UserRole.MODERATOR, "/admin/utilisateurs");

  const userId = String(formData.get("userId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim() || null;
  const daysRaw = String(formData.get("days") ?? "").trim();
  const days = daysRaw ? Number(daysRaw) : 0;

  if (!userId) {
    redirect(
      "/admin/utilisateurs?error=" + encodeURIComponent("Utilisateur introuvable."),
    );
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, role: true, isBanned: true },
  });
  if (!target) {
    redirect(
      "/admin/utilisateurs?error=" + encodeURIComponent("Utilisateur introuvable."),
    );
  }

  // Garde-fou hiérarchie : on ne bannit pas quelqu'un de même rang ou supérieur.
  if (ROLE_RANK[target.role] >= ROLE_RANK[admin.role]) {
    redirect(
      "/admin/utilisateurs?error=" +
        encodeURIComponent("Tu ne peux pas bannir un compte de rôle égal ou supérieur."),
    );
  }

  const bannedUntil =
    Number.isFinite(days) && days > 0
      ? new Date(Date.now() + days * 24 * 60 * 60 * 1000)
      : null;

  await prisma.user.update({
    where: { id: target.id },
    data: {
      isBanned: true,
      bannedUntil,
      banReason: reason,
    },
  });

  // Révoque immédiatement toutes les sessions actives. Sans ça, un user
  // banni resterait techniquement connecté tant que son cookie Supabase
  // n'est pas expiré — `requireActiveUser` finirait par le dégager
  // (rebond vers /banni à la prochaine requête server action), mais
  // entre-temps il peut spammer des endpoints côté client. Deleting ses
  // rows `sessions` coupe ça net.
  const revoked = await prisma.session.deleteMany({
    where: { userId: target.id },
  });

  await logAdminAction({
    adminId: admin.id,
    action: AdminActionType.BAN_USER,
    targetType: AdminTargetType.USER,
    targetId: target.id,
    reason,
    metadata: {
      username: target.username,
      days: days || null,
      bannedUntil: bannedUntil?.toISOString() ?? null,
      revokedSessions: revoked.count,
    },
  });

  revalidatePath("/admin/utilisateurs");
  redirect(
    "/admin/utilisateurs?success=" +
      encodeURIComponent(`@${target.username} banni.`),
  );
}

/**
 * Débannir : on remet à plat isBanned, bannedUntil et banReason pour
 * ne pas garder de trace stale qui pourrait induire en erreur (ex. un
 * banReason d'il y a 6 mois alors qu'on vient de dé-bannir).
 */
export async function adminUnbanUserAction(formData: FormData) {
  const admin = await requireRole(UserRole.MODERATOR, "/admin/utilisateurs");

  const userId = String(formData.get("userId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim() || null;

  if (!userId) {
    redirect(
      "/admin/utilisateurs?error=" + encodeURIComponent("Utilisateur introuvable."),
    );
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, isBanned: true },
  });
  if (!target) {
    redirect(
      "/admin/utilisateurs?error=" + encodeURIComponent("Utilisateur introuvable."),
    );
  }

  await prisma.user.update({
    where: { id: target.id },
    data: {
      isBanned: false,
      bannedUntil: null,
      banReason: null,
    },
  });

  await logAdminAction({
    adminId: admin.id,
    action: AdminActionType.UNBAN_USER,
    targetType: AdminTargetType.USER,
    targetId: target.id,
    reason,
    metadata: { username: target.username },
  });

  revalidatePath("/admin/utilisateurs");
  redirect(
    "/admin/utilisateurs?success=" +
      encodeURIComponent(`@${target.username} débanni.`),
  );
}

/**
 * Shadow-ban : l'utilisateur ne voit pas qu'il est banni, ses contenus
 * restent visibles pour lui mais invisibles pour les autres. Utile
 * pour les trolls persistants qu'on veut décourager sans alerter.
 *
 * On toggle : si déjà shadow-banned, on enlève. Sinon, on met.
 */
export async function adminToggleShadowBanAction(formData: FormData) {
  const admin = await requireRole(UserRole.MODERATOR, "/admin/utilisateurs");

  const userId = String(formData.get("userId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim() || null;

  if (!userId) {
    redirect(
      "/admin/utilisateurs?error=" + encodeURIComponent("Utilisateur introuvable."),
    );
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, role: true, shadowBanned: true },
  });
  if (!target) {
    redirect(
      "/admin/utilisateurs?error=" + encodeURIComponent("Utilisateur introuvable."),
    );
  }

  if (ROLE_RANK[target.role] >= ROLE_RANK[admin.role]) {
    redirect(
      "/admin/utilisateurs?error=" +
        encodeURIComponent("Rôle protégé."),
    );
  }

  const newValue = !target.shadowBanned;

  await prisma.user.update({
    where: { id: target.id },
    data: { shadowBanned: newValue },
  });

  await logAdminAction({
    adminId: admin.id,
    action: newValue
      ? AdminActionType.SHADOW_BAN_USER
      : AdminActionType.UNSHADOW_BAN_USER,
    targetType: AdminTargetType.USER,
    targetId: target.id,
    reason,
    metadata: { username: target.username },
  });

  revalidatePath("/admin/utilisateurs");
  redirect(
    "/admin/utilisateurs?success=" +
      encodeURIComponent(
        newValue
          ? `@${target.username} shadow-banni.`
          : `@${target.username} rétabli.`,
      ),
  );
}
