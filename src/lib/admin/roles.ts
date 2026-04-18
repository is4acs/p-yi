import { UserRole, type User } from "@prisma/client";

import { hasRole } from "@/lib/auth/current-user";

/**
 * Helpers de présentation pour l'UI admin. Ne font PAS de guard côté
 * serveur — utilise `requireRole()` pour protéger une route. Ceux-ci
 * servent uniquement à afficher/masquer des boutons (ex: "Promouvoir"
 * visible seulement pour un SUPER_ADMIN).
 *
 * Réutilisent tous `hasRole()` donc la logique ban/rank reste
 * centralisée.
 */

export function isModerator(user: User | null | undefined): boolean {
  return hasRole(user, UserRole.MODERATOR);
}

export function isAdmin(user: User | null | undefined): boolean {
  return hasRole(user, UserRole.ADMIN);
}

export function isSuperAdmin(user: User | null | undefined): boolean {
  return hasRole(user, UserRole.SUPER_ADMIN);
}

/**
 * Libellé FR court pour afficher un rôle dans l'UI. Pour USER/PRO/
 * AMBASSADOR on renvoie "Utilisateur" car côté modération ils sont
 * équivalents.
 */
export function formatRole(role: UserRole): string {
  switch (role) {
    case UserRole.SUPER_ADMIN:
      return "Super admin";
    case UserRole.ADMIN:
      return "Admin";
    case UserRole.MODERATOR:
      return "Modérateur";
    case UserRole.PRO:
      return "Compte pro";
    case UserRole.AMBASSADOR:
      return "Ambassadeur";
    case UserRole.USER:
    default:
      return "Utilisateur";
  }
}
