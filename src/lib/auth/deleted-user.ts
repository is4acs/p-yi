import type { Prisma, User } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/**
 * Username réservé pour le compte système qui hérite des contenus
 * anonymisés lors de la suppression d'un compte utilisateur. Le nom
 * est unique au niveau de la DB ; le premier appel à
 * `getOrCreateDeletedUser` crée la ligne et les suivants la
 * récupèrent. Un vrai utilisateur ne peut donc pas le squatter.
 */
export const DELETED_USER_USERNAME = "__deleted__";

/**
 * Email placeholder pour le compte système. Le domaine `peyi.internal`
 * n'est pas routable — aucun risque de collision avec un vrai utilisateur.
 */
const DELETED_USER_EMAIL = "deleted-user@peyi.internal";

/**
 * Récupère ou crée le compte système `__deleted__`. Appelé par la
 * server action de suppression de compte pour réattacher les contenus
 * qu'on choisit d'anonymiser plutôt que de hard-delete :
 *  - Commentaires qui ont des réponses d'autres utilisateurs
 *  - Messages envoyés / reçus (préserve la cohérence côté l'autre
 *    partie de la conversation)
 *  - Signalements (préserve la trace de modération)
 *  - Lignes AdminActionLog (préserve l'audit trail)
 *
 * Le user système est marqué `isBanned=true` avec une `banReason`
 * explicite pour qu'il n'apparaisse jamais dans les listings admin
 * comme un user actif, et pour qu'aucune action ne puisse lui être
 * "recollée" par erreur (requireActiveUser redirect vers /banni).
 *
 * Idempotent : peut être appelé plusieurs fois, renvoie toujours la
 * même ligne. Utilise `upsert` pour éviter une race condition si deux
 * suppressions de comptes tombent en parallèle sur un système neuf.
 *
 * Le tx optionnel permet à l'appelant d'exécuter dans sa propre
 * transaction Prisma — important pour que la création du user système
 * soit cohérente avec les UPDATE qui s'ensuivent.
 */
export async function getOrCreateDeletedUser(
  tx: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<User> {
  return tx.user.upsert({
    where: { username: DELETED_USER_USERNAME },
    update: {},
    create: {
      // On laisse Prisma générer l'id (uuid). On n'a pas besoin d'un id
      // stable entre environnements — les références se font par
      // lookup username.
      email: DELETED_USER_EMAIL,
      username: DELETED_USER_USERNAME,
      fullName: "[Compte supprimé]",
      isBanned: true,
      banReason:
        "Compte système — placeholder pour les contenus anonymisés après suppression d'un utilisateur.",
      // Rôle minimum pour ne lui donner aucun privilège même si un
      // bug faisait passer le ban.
      role: "USER",
    },
  });
}
