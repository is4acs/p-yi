import "server-only";

import { AdminActionType, AdminTargetType, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/**
 * Enregistre une action admin dans l'audit trail. À appeler APRÈS
 * l'action elle-même (on ne veut pas logger un DELETE qui échoue).
 *
 * Conventions :
 *  - `reason` : ce que l'admin a tapé (motif libre en FR). Stocké tel
 *    quel, visible en /admin/logs. Null si pas de motif saisi.
 *  - `metadata` : contexte non-structuré. Ex: lors d'un SET_ROLE on y
 *    met `{ oldRole, newRole }`, lors d'un DELETE_LISTING on y met
 *    `{ slug, title }` pour retrouver le contenu même après suppression.
 *  - On n'utilise PAS `prisma.$transaction` pour coupler au write
 *    principal : si le log échoue (ce qui devrait être rarissime) on
 *    préfère que l'action soit quand même effectuée, avec une entrée
 *    "manquante" dans les logs, plutôt que de laisser du contenu toxique
 *    en ligne.
 */
export async function logAdminAction(params: {
  adminId: string;
  action: AdminActionType;
  targetType: AdminTargetType;
  targetId: string;
  reason?: string | null;
  metadata?: Prisma.InputJsonValue | null;
}): Promise<void> {
  try {
    await prisma.adminActionLog.create({
      data: {
        adminId: params.adminId,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        reason: params.reason?.trim() || null,
        metadata: params.metadata ?? Prisma.JsonNull,
      },
    });
  } catch (err) {
    // On log sur stderr pour que Vercel l'attrape, mais on ne fait pas
    // remonter — le caller a déjà fait son travail et on ne veut pas
    // lui montrer une erreur 500 juste parce que l'audit est tombé.
    console.error("[logAdminAction] failed to write audit log", {
      adminId: params.adminId,
      action: params.action,
      err,
    });
  }
}
