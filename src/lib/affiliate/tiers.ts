/**
 * Barème progressif de récompenses d'affiliation. Chaque palier correspond
 * à un nombre cumulé de filleuls qualifiés (un filleul est qualifié dès
 * qu'il a publié 5 bons plans + 5 annonces dans les 90 jours suivant son
 * inscription).
 *
 * Les montants sont stockés en centimes pour éviter les erreurs décimales
 * (2000 centimes = 20,00 €).
 *
 * Le taux par filleul augmente avec les paliers : on récompense la
 * constance et on évite le "20 € puis j'arrête".
 *
 *   Palier 1  →  10 filleuls  →  20,00 €  (2,00 €/filleul)
 *   Palier 2  →  25 filleuls  →  45,00 €  cumulés (+25,00 €)
 *   Palier 3  →  50 filleuls  → 100,00 €  cumulés (+55,00 €)
 *   Palier 4  → 100 filleuls  → 250,00 €  cumulés (+150,00 €)
 *   Palier 5  → 250 filleuls  → 800,00 €  cumulés (+550,00 €)
 */
export type AffiliateTier = {
  threshold: number;        // nombre de filleuls qualifiés pour atteindre ce palier
  cumulativeCents: number;  // total gagné quand ce palier est atteint
  rewardCents: number;      // delta à créditer en passant du palier précédent à celui-ci
  label: string;
};

export const AFFILIATE_TIERS: AffiliateTier[] = [
  { threshold: 10,  cumulativeCents: 2000,   rewardCents: 2000,   label: "Palier 1 — 10 filleuls" },
  { threshold: 25,  cumulativeCents: 4500,   rewardCents: 2500,   label: "Palier 2 — 25 filleuls" },
  { threshold: 50,  cumulativeCents: 10000,  rewardCents: 5500,   label: "Palier 3 — 50 filleuls" },
  { threshold: 100, cumulativeCents: 25000,  rewardCents: 15000,  label: "Palier 4 — 100 filleuls" },
  { threshold: 250, cumulativeCents: 80000,  rewardCents: 55000,  label: "Palier 5 — 250 filleuls (Ambassadeur)" },
];

/**
 * Bonus "1er filleul qualifié" versé une seule fois — motive les petits
 * parrains à activer leur premier filleul.
 */
export const FIRST_REFEREE_BONUS_CENTS = 500; // 5,00 €

/**
 * Cap mensuel par défaut (anti-abus). Un parrain non-ambassadeur ne peut
 * pas gagner plus de 500 €/mois sans validation manuelle admin.
 */
export const DEFAULT_MONTHLY_CAP_CENTS = 50000; // 500,00 €

/**
 * Délai dont dispose un filleul pour se qualifier, en jours, à partir de
 * son inscription.
 */
export const QUALIFICATION_WINDOW_DAYS = 90;

/**
 * Nombre de bons plans publiés requis pour qu'un filleul soit qualifié.
 */
export const REQUIRED_DEALS = 5;

/**
 * Nombre d'annonces publiées requises pour qu'un filleul soit qualifié.
 */
export const REQUIRED_LISTINGS = 5;

/**
 * Renvoie la liste des paliers franchis entre `previousCount` et
 * `newCount` (exclu / inclus). Utile pour créditer plusieurs paliers
 * d'un coup si jamais un batch de qualifications passe en une fois.
 */
export function tiersReachedBetween(
  previousCount: number,
  newCount: number,
): AffiliateTier[] {
  if (newCount <= previousCount) return [];
  return AFFILIATE_TIERS.filter(
    (t) => t.threshold > previousCount && t.threshold <= newCount,
  );
}

/**
 * Renvoie le palier dont on se rapproche (le prochain non atteint) et le
 * nombre de filleuls qualifiés manquants pour l'atteindre. Utilisé par
 * l'UI pour afficher une barre de progression "X/10 filleuls qualifiés".
 */
export function nextTier(qualifiedCount: number): {
  tier: AffiliateTier | null;
  remaining: number;
  previousThreshold: number;
} {
  const sorted = [...AFFILIATE_TIERS].sort((a, b) => a.threshold - b.threshold);
  for (const t of sorted) {
    if (qualifiedCount < t.threshold) {
      const previousThreshold = sorted
        .filter((x) => x.threshold < t.threshold && x.threshold <= qualifiedCount)
        .pop()?.threshold ?? 0;
      return {
        tier: t,
        remaining: t.threshold - qualifiedCount,
        previousThreshold,
      };
    }
  }
  return { tier: null, remaining: 0, previousThreshold: sorted[sorted.length - 1]?.threshold ?? 0 };
}

/**
 * Formate un montant en centimes en chaîne française "12,50 €".
 */
export function formatCents(cents: number): string {
  const euros = cents / 100;
  return euros.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: euros % 1 === 0 ? 0 : 2,
  });
}
