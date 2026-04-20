// Paliers "round numbers" de karma qui déclenchent une notification
// KARMA_MILESTONE. Volontairement distincts des seuils de niveau
// (0, 50, 200, 500, 2000, 5000) pour éviter le double-envoi avec
// LEVEL_UP au même moment.
//
// L'intention : féliciter l'utilisateur entre deux niveaux pour
// maintenir la motivation. La plus grosse marche (EXPERT → LEGEND
// = 1500 karma à gagner) devient moins silencieuse grâce au palier
// intermédiaire à 1000.

export const KARMA_MILESTONES = [100, 1000, 3000, 10000] as const;

export type KarmaMilestone = (typeof KARMA_MILESTONES)[number];

type MilestoneMeta = {
  title: string;
  message: string;
};

export const MILESTONE_META: Record<KarmaMilestone, MilestoneMeta> = {
  100: {
    title: "100 karma atteints 🌱",
    message: "Belle énergie ! Continue comme ça, les bons plans de Guyane t'attendent.",
  },
  1000: {
    title: "1 000 karma atteints 🔥",
    message: "Respect. Tu es clairement dans le top des contributeurs Péyi.",
  },
  3000: {
    title: "3 000 karma atteints 👑",
    message: "Une pointure de la communauté. Merci pour tout ce que tu partages.",
  },
  10000: {
    title: "10 000 karma atteints 🏆",
    message: "Niveau mythique. Tu fais vivre Péyi au quotidien, chapeau bas.",
  },
};

/**
 * Renvoie les paliers franchis *entre* deux valeurs de karma.
 *
 * Utilisé après un `awardKarma` pour détecter si l'utilisateur vient
 * de passer une borne ronde. Typiquement on append 1 seul milestone,
 * mais le type est plural pour gérer un ADMIN_ADJUSTMENT qui bondirait
 * de plusieurs centaines/milliers d'un coup.
 *
 * - Strict `>` sur `before` pour ne pas re-notifier si on était pile
 *   sur le palier (cas d'un dé-karma puis re-award exact).
 * - Pas de milestone franchi si `after <= before` (ex: DEAL_REMOVED,
 *   SPAM_PENALTY) — la fonction renvoie un tableau vide.
 */
export function findCrossedMilestones(
  before: number,
  after: number,
): KarmaMilestone[] {
  if (after <= before) return [];
  return KARMA_MILESTONES.filter((m) => before < m && after >= m);
}
