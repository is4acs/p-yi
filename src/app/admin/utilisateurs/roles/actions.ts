"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AdminActionType, AdminTargetType, UserRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { ROLE_RANK, requireRole } from "@/lib/auth/current-user";
import { logAdminAction } from "@/lib/admin/log";

const ALLOWED_ROLES = new Set<UserRole>([
  UserRole.USER,
  UserRole.PRO,
  UserRole.AMBASSADOR,
  UserRole.MODERATOR,
  UserRole.ADMIN,
  UserRole.SUPER_ADMIN,
]);

/**
 * Attribution de rôle — action la plus sensible du panel.
 *
 * Règles :
 * 1. Seul un SUPER_ADMIN peut appeler cette action.
 * 2. On ne peut pas modifier son propre rôle (pour éviter un
 *    super-admin qui se rétrograde par erreur et se verrouille hors du
 *    système).
 * 3. On refuse de créer un second SUPER_ADMIN via l'interface : il n'y
 *    a qu'un seul super-admin par design du projet, l'ajout se fait
 *    via le script `scripts/promote-super-admin.ts` directement en
 *    base. C'est volontaire pour éviter qu'une session volée ne puisse
 *    créer un pair.
 * 4. On refuse le rôle cible s'il est > au rôle de l'appelant (défense
 *    en profondeur — en pratique impossible puisqu'on exige
 *    SUPER_ADMIN, donc tous les rôles sont <=).
 */
export async function adminSetRoleAction(formData: FormData) {
  const admin = await requireRole(
    UserRole.SUPER_ADMIN,
    "/admin/utilisateurs/roles",
  );

  const userId = String(formData.get("userId") ?? "");
  const newRoleRaw = String(formData.get("role") ?? "");
  const reason = String(formData.get("reason") ?? "").trim() || null;

  if (!userId) {
    redirect(
      "/admin/utilisateurs/roles?error=" +
        encodeURIComponent("Utilisateur introuvable."),
    );
  }
  if (!ALLOWED_ROLES.has(newRoleRaw as UserRole)) {
    redirect(
      "/admin/utilisateurs/roles?error=" + encodeURIComponent("Rôle invalide."),
    );
  }
  const newRole = newRoleRaw as UserRole;

  if (userId === admin.id) {
    redirect(
      "/admin/utilisateurs/roles?error=" +
        encodeURIComponent("Tu ne peux pas modifier ton propre rôle."),
    );
  }

  if (newRole === UserRole.SUPER_ADMIN) {
    redirect(
      "/admin/utilisateurs/roles?error=" +
        encodeURIComponent(
          "La création d'un SUPER_ADMIN se fait via le script CLI, pas via l'UI.",
        ),
    );
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, role: true },
  });
  if (!target) {
    redirect(
      "/admin/utilisateurs/roles?error=" +
        encodeURIComponent("Utilisateur introuvable."),
    );
  }

  // On ne rétrograde pas un autre SUPER_ADMIN via l'UI non plus — même
  // logique défensive.
  if (target.role === UserRole.SUPER_ADMIN) {
    redirect(
      "/admin/utilisateurs/roles?error=" +
        encodeURIComponent(
          "On ne rétrograde pas un super-admin via l'UI (utilise le script).",
        ),
    );
  }

  if (ROLE_RANK[newRole] > ROLE_RANK[admin.role]) {
    redirect(
      "/admin/utilisateurs/roles?error=" +
        encodeURIComponent("Rôle cible supérieur à ton propre rôle."),
    );
  }

  if (target.role === newRole) {
    redirect(
      "/admin/utilisateurs/roles?success=" +
        encodeURIComponent("Rôle inchangé."),
    );
  }

  const previousRole = target.role;

  await prisma.user.update({
    where: { id: target.id },
    data: { role: newRole },
  });

  await logAdminAction({
    adminId: admin.id,
    action: AdminActionType.SET_ROLE,
    targetType: AdminTargetType.USER,
    targetId: target.id,
    reason,
    metadata: {
      username: target.username,
      previousRole,
      newRole,
    },
  });

  revalidatePath("/admin/utilisateurs");
  revalidatePath("/admin/utilisateurs/roles");
  redirect(
    "/admin/utilisateurs/roles?success=" +
      encodeURIComponent(`@${target.username} → ${newRole}.`),
  );
}
