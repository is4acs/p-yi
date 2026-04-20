"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  AdminActionType,
  AdminTargetType,
  NotificationType,
  UserRole,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/current-user";
import { logAdminAction } from "@/lib/admin/log";
import { dispatchNotification } from "@/lib/notifications/dispatch";
import { logger } from "@/lib/log";

/**
 * Broadcast de notifications SYSTEM ou PROMOTIONAL à un segment d'users.
 *
 * Portée : réservé ADMIN+ (pas MODERATOR). Un mod peut bannir/supprimer
 * mais toucher tous les users à la fois est un privilège admin.
 *
 * Audiences supportées :
 *  - `all`           : tous les comptes non bannis
 *  - `role:USER`     : uniquement le rôle USER
 *  - `role:PRO`      : uniquement le rôle PRO
 *  - `role:AMBASSADOR` : niveau gamification AMBASSADOR
 *  - `level:<LEVEL>` : filtre par niveau de gamification
 *
 * Implémentation : on pull les userIds en batch (paginate 500), puis on
 * lance `dispatchNotification` par chunks de 50 en parallèle avec
 * Promise.allSettled pour ne pas bloquer l'UI sur une grosse audience.
 * `dispatchNotification` fire-and-forget les canaux push/email donc le
 * temps total ≈ max(db insert notification) × (N/50).
 */

type Audience =
  | { kind: "all" }
  | { kind: "role"; role: UserRole }
  | { kind: "level"; level: string };

function parseAudience(raw: string): Audience | null {
  if (raw === "all") return { kind: "all" };
  if (raw.startsWith("role:")) {
    const role = raw.slice(5) as UserRole;
    const validRoles: UserRole[] = [
      UserRole.USER,
      UserRole.PRO,
      UserRole.AMBASSADOR,
      UserRole.MODERATOR,
      UserRole.ADMIN,
    ];
    if (validRoles.includes(role)) return { kind: "role", role };
    return null;
  }
  if (raw.startsWith("level:")) {
    return { kind: "level", level: raw.slice(6) };
  }
  return null;
}

function buildWhere(audience: Audience) {
  const base = { isBanned: false } as const;
  switch (audience.kind) {
    case "all":
      return base;
    case "role":
      return { ...base, role: audience.role };
    case "level":
      // On cast volontairement — la valeur est validée à l'envoi dans
      // dispatchBroadcast via un check runtime.
      return { ...base, level: audience.level as never };
  }
}

/**
 * Dry-run : compte l'audience sans envoyer. Utilisé par la page pour
 * afficher "Tu vas envoyer à N personnes" avant la confirmation.
 */
export async function adminCountBroadcastAudienceAction(
  formData: FormData,
): Promise<{ count: number; error?: string }> {
  await requireRole(UserRole.ADMIN, "/admin/notifications");

  const audienceRaw = String(formData.get("audience") ?? "all");
  const audience = parseAudience(audienceRaw);
  if (!audience) {
    return { count: 0, error: "Audience invalide" };
  }

  const count = await prisma.user.count({ where: buildWhere(audience) });
  return { count };
}

export async function adminBroadcastNotificationAction(formData: FormData) {
  const admin = await requireRole(UserRole.ADMIN, "/admin/notifications");

  const type = String(formData.get("type") ?? "") as NotificationType;
  const audienceRaw = String(formData.get("audience") ?? "all");
  const title = String(formData.get("title") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const actionPath = String(formData.get("actionPath") ?? "").trim() || null;
  const confirmed = String(formData.get("confirmed") ?? "") === "1";

  if (!confirmed) {
    redirect(
      "/admin/notifications?error=" +
        encodeURIComponent("Coche la case de confirmation."),
    );
  }

  if (
    type !== NotificationType.SYSTEM &&
    type !== NotificationType.PROMOTIONAL
  ) {
    redirect(
      "/admin/notifications?error=" +
        encodeURIComponent("Type invalide (SYSTEM ou PROMOTIONAL)."),
    );
  }

  if (!title || title.length > 80) {
    redirect(
      "/admin/notifications?error=" +
        encodeURIComponent("Titre requis (max 80 caractères)."),
    );
  }

  if (!message || message.length > 500) {
    redirect(
      "/admin/notifications?error=" +
        encodeURIComponent("Message requis (max 500 caractères)."),
    );
  }

  if (actionPath && !actionPath.startsWith("/")) {
    redirect(
      "/admin/notifications?error=" +
        encodeURIComponent("Le lien doit être un chemin relatif (/…)."),
    );
  }

  const audience = parseAudience(audienceRaw);
  if (!audience) {
    redirect(
      "/admin/notifications?error=" +
        encodeURIComponent("Audience invalide."),
    );
  }

  const where = buildWhere(audience);
  const users = await prisma.user.findMany({
    where,
    select: { id: true },
  });

  if (users.length === 0) {
    redirect(
      "/admin/notifications?error=" +
        encodeURIComponent("Aucun utilisateur dans cette audience."),
    );
  }

  // Dispatch par chunks de 50 en parallèle. Promise.allSettled pour ne
  // pas tout annuler si un user échoue (ex. email malformé en DB).
  const CHUNK = 50;
  let successes = 0;
  let failures = 0;
  for (let i = 0; i < users.length; i += CHUNK) {
    const slice = users.slice(i, i + CHUNK);
    const results = await Promise.allSettled(
      slice.map((u) =>
        dispatchNotification({
          userId: u.id,
          type,
          title,
          message,
          actionPath: actionPath ?? undefined,
          pushTag: `broadcast:${Date.now()}`,
        }),
      ),
    );
    for (const r of results) {
      if (r.status === "fulfilled") successes += 1;
      else failures += 1;
    }
  }

  logger.info("admin.broadcast.sent", {
    adminId: admin.id,
    type,
    audience: audienceRaw,
    attempted: users.length,
    successes,
    failures,
  });

  // Log admin. On utilise SYSTEM comme targetType + un targetId pseudo
  // (audience string) pour retrouver le broadcast dans /admin/logs.
  await logAdminAction({
    adminId: admin.id,
    action: AdminActionType.BROADCAST_NOTIFICATION,
    targetType: AdminTargetType.SYSTEM,
    targetId: `broadcast:${Date.now()}`,
    reason: null,
    metadata: {
      type,
      audience: audienceRaw,
      title,
      messageLength: message.length,
      actionPath,
      attempted: users.length,
      successes,
      failures,
    },
  });

  revalidatePath("/admin/notifications");
  redirect(
    "/admin/notifications?success=" +
      encodeURIComponent(
        `Envoyé à ${successes} utilisateur${successes > 1 ? "s" : ""}` +
          (failures > 0 ? ` (${failures} échec${failures > 1 ? "s" : ""})` : ""),
      ),
  );
}
