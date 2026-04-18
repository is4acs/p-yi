/**
 * Simulateur d'engagement pour donner vie aux deals ingérés.
 *
 * Objectif : un deal scrapé qui tombe dans la DB ne ressemble pas à un
 * bon plan communautaire — pas de votes, pas de commentaires, aucune
 * vue. Ici on génère des chiffres cohérents en fonction de l'âge du
 * deal et d'une "qualité" (% de remise, prix d'entrée) pour que le
 * classement HOT et le feed aient l'air habité.
 *
 * Règles :
 *   - Plus le deal est récent, moins il a de vues (croît avec l'âge).
 *   - Plus la remise est forte, plus la température est haute.
 *   - Les downvotes sont toujours rares (~10% des upvotes).
 *   - Le nombre de commentaires corrèle avec les upvotes.
 */
import type { AttributedCandidate, DealCandidate } from "../types";
import { PERSONAS, pickAuthor } from "../personas";

const COMMENT_BANK = [
  "Merci pour le partage !",
  "Pris hier, bien reçu ✅",
  "Encore dispo ?",
  "Bon plan confirmé, j'y suis passé ce matin.",
  "Attention, les stocks partent vite.",
  "Le prix a changé, c'est plus 39€ c'est 45€ maintenant.",
  "Je confirme, c'est le meilleur prix depuis 6 mois.",
  "Marche aussi avec le code PEYI5 pour 5€ de moins.",
  "Pas de frais de port vers la Guyane 👍",
  "Compte 5-7j d'expédition depuis la métropole.",
  "En rayon au magasin hier, il en reste.",
  "J'hésite, quelqu'un a testé la qualité ?",
  "Top, commandé sans hésiter.",
  "Attention c'est une vente flash, ça se termine dimanche.",
  "+1, bon plan.",
  "Pas mal, mais je préfère attendre les soldes.",
  "Déjà vu moins cher ailleurs mais bon plan quand même.",
  "Ça vaut le coup pour le prix.",
  "Trop tard, rupture de stock 😭",
  "Parfait pour la rentrée",
];

function rng(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return () => {
    h = (h * 1_103_515_245 + 12_345) >>> 0;
    return h / 0xffffffff;
  };
}

/**
 * Heuristique "qualité" d'un deal entre 0 et 1 :
 *   - remise > 50% → 0.9
 *   - remise 30-50% → 0.7
 *   - remise 10-30% → 0.5
 *   - sinon → 0.3
 *   - deals gratuits → 0.8
 */
function qualityScore(c: DealCandidate): number {
  if (c.isFree) return 0.8;
  if (!c.originalPrice || c.originalPrice <= c.price) return 0.3;
  const discount = (c.originalPrice - c.price) / c.originalPrice;
  if (discount > 0.5) return 0.9;
  if (discount > 0.3) return 0.7;
  if (discount > 0.1) return 0.5;
  return 0.35;
}

export function attachEngagement(c: DealCandidate): AttributedCandidate {
  const rand = rng(c.fingerprint);
  const ageHours = Math.max(
    0.5,
    (Date.now() - c.publishedAt.getTime()) / 3_600_000,
  );
  const quality = qualityScore(c);

  // Vues : accumulation logarithmique avec l'âge, pondérée par la qualité
  const viewCount = Math.round(
    quality * (120 + Math.log10(ageHours + 1) * 600) * (0.7 + rand() * 0.6),
  );
  // Clicks : 4-8% des vues
  const clickCount = Math.round(viewCount * (0.04 + rand() * 0.04));
  // Upvotes : ~2% des vues sur un deal de qualité
  const upvotes = Math.max(
    1,
    Math.round(viewCount * (0.01 + quality * 0.02) * (0.6 + rand() * 0.8)),
  );
  const downvotes = Math.round(upvotes * (0.05 + rand() * 0.15));
  // Commentaires : 15-35% des upvotes
  const commentCount = Math.round(upvotes * (0.15 + rand() * 0.2));
  // Température (règle Péyi : HOT=+10°, COLD=-5°)
  const temperature = upvotes * 10 - downvotes * 5;

  // Banc de commentaires (on prend entre 0 et min(4, commentCount))
  const n = Math.min(commentCount, 4);
  const seedComments: string[] = [];
  const used = new Set<number>();
  while (seedComments.length < n) {
    const idx = Math.floor(rand() * COMMENT_BANK.length);
    if (used.has(idx)) continue;
    used.add(idx);
    seedComments.push(COMMENT_BANK[idx]);
  }

  const author = pickAuthor(c.categorySlug, c.fingerprint, PERSONAS);

  return {
    ...c,
    authorUsername: author.username,
    temperature,
    upvotes,
    downvotes,
    viewCount,
    clickCount,
    commentCount,
    seedComments,
  };
}

/**
 * Étale publishedAt sur les N derniers jours en fonction du fingerprint
 * (déterministe). Utilisé en mode backfill pour ne pas avoir tous les
 * deals datés de la même heure.
 */
export function spreadPublishedAt(c: DealCandidate, days: number): Date {
  const rand = rng(c.fingerprint + "-spread");
  const hoursAgo = rand() * days * 24;
  return new Date(Date.now() - hoursAgo * 3_600_000);
}
