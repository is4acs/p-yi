import { KarmaAction } from "@prisma/client";

// Table des règles de karma. Une règle par action : combien de points, un
// libellé humain pour l'historique, et un flag `oneShot` pour empêcher le
// farming (ex: PROFILE_COMPLETE ne doit rapporter qu'une fois). Les règles
// non one-shot sont cumulatives par nature (chaque deal posté = +5).
export const KARMA_RULES: Record<
  KarmaAction,
  { points: number; label: string; oneShot: boolean }
> = {
  DEAL_POSTED: { points: 5, label: "Bon plan publié", oneShot: false },
  DEAL_HOT_100: { points: 20, label: "Deal à +100°", oneShot: false },
  DEAL_HOT_500: { points: 50, label: "Deal à +500°", oneShot: false },
  COMMENT_USEFUL: { points: 2, label: "Commentaire", oneShot: false },
  REPORT_VALID: { points: 10, label: "Signalement confirmé", oneShot: false },
  REFERRAL: { points: 30, label: "Ami parrainé", oneShot: false },
  PROFILE_COMPLETE: { points: 15, label: "Profil complété", oneShot: true },
  DAILY_LOGIN: { points: 1, label: "Connexion quotidienne", oneShot: false },
  ANNIVERSARY: { points: 25, label: "Anniversaire Péyi", oneShot: false },
  ADMIN_ADJUSTMENT: { points: 0, label: "Ajustement admin", oneShot: false },
  DEAL_REMOVED: { points: -5, label: "Bon plan retiré", oneShot: false },
  SPAM_PENALTY: { points: -20, label: "Pénalité spam", oneShot: false },
};
