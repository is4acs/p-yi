import {
  DealStatus,
  ListingStatus,
  NotificationType,
  ReferralStatus,
  type Prisma,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/log";
import { dispatchNotification } from "@/lib/notifications/dispatch";

import {
  FIRST_REFEREE_BONUS_CENTS,
  REQUIRED_DEALS,
  REQUIRED_LISTINGS,
  tiersReachedBetween,
  formatCents,
} from "./tiers";

type PrismaTx = Prisma.TransactionClient;

// Intention de notif collectée dans la transaction puis dispatchée
// après son commit. On garde la forme DispatchInput-compatible pour
// éviter toute gymnastique côté appelant.
type PendingNotification = {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  actionPath: string;
  fromUserId?: string | null;
};

/**
 * Vérifie et fait progresser le statut de parrainage d'un utilisateur
 * qui vient de publier un contenu (bon plan ou annonce).
 *
 * Logique :
 *  1. Est-ce que cet utilisateur est filleul d'un autre ? Si non → rien.
 *  2. La `Referral` est-elle encore PENDING et dans les délais ?
 *  3. Compte les deals PUBLISHED + listings PUBLISHED du filleul.
 *  4. Si ≥ 5 deals ET ≥ 5 annonces → passe en QUALIFIED :
 *     - incrémente `AffiliateProfile.qualifiedCount` du parrain
 *     - vérifie si un palier est franchi (10/25/50/100/250) et crédite
 *     - si c'est le 1er filleul qualifié, verse le bonus de bienvenue
 *     - crée les notifications adéquates
 *
 * Cette fonction est appelée depuis `createDealAction` et
 * `createListingAction` après chaque publication. Elle est idempotente :
 * une `Referral` déjà QUALIFIED n'est pas recomptée.
 *
 * Ne throw jamais — un échec côté affiliation ne doit pas empêcher la
 * publication du contenu.
 */
export async function maybeQualifyReferee(refereeId: string): Promise<void> {
  try {
    const referral = await prisma.referral.findUnique({
      where: { refereeId },
      select: {
        id: true,
        referrerId: true,
        status: true,
        expiresAt: true,
      },
    });

    // Pas de parrain, ou déjà qualifié / expiré : rien à faire.
    if (!referral) return;
    if (referral.status !== ReferralStatus.PENDING) return;

    // Fenêtre de qualification dépassée : on marque EXPIRED et on s'arrête.
    // Le filleul peut continuer à publier, simplement ça ne comptera plus
    // pour le parrain.
    if (referral.expiresAt < new Date()) {
      await prisma.referral.update({
        where: { id: referral.id },
        data: { status: ReferralStatus.EXPIRED },
      });
      return;
    }

    const [dealsPublished, listingsPublished] = await Promise.all([
      prisma.deal.count({
        where: { authorId: refereeId, status: DealStatus.PUBLISHED },
      }),
      prisma.listing.count({
        where: { authorId: refereeId, status: ListingStatus.PUBLISHED },
      }),
    ]);

    if (
      dealsPublished < REQUIRED_DEALS ||
      listingsPublished < REQUIRED_LISTINGS
    ) {
      // Pas encore qualifié : on met juste à jour les compteurs snapshot
      // pour que la page /profil/affiliation du parrain affiche la
      // progression du filleul.
      await prisma.referral.update({
        where: { id: referral.id },
        data: { dealsPublished, listingsPublished },
      });
      return;
    }

    // Qualification atteinte ! Tout se passe dans une transaction pour
    // rester cohérent en cas d'erreur à mi-chemin. Les notifs (push +
    // email + row in-app) sont dispatchées APRÈS le commit — elles ne
    // doivent jamais annuler la qualification si un canal externe
    // tombe.
    const pending = await prisma.$transaction(async (tx) =>
      qualifyInTransaction(tx, {
        referralId: referral.id,
        referrerId: referral.referrerId,
        refereeId,
        dealsPublished,
        listingsPublished,
      }),
    );

    for (const n of pending) {
      await dispatchNotification(n).catch((err) => {
        logger.warn("affiliate.dispatch.failed", {
          referrerId: n.userId,
          type: n.type,
          err: err instanceof Error ? err.message : String(err),
        });
      });
    }
  } catch (err) {
    logger.error("affiliate.qualify.failed", {
      refereeId,
      err: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Corps transactionnel de la qualification. Sort dans une fonction à
 * part pour pouvoir être testé en isolation plus tard.
 *
 * Retourne la liste des notifications à dispatcher APRÈS le commit —
 * on ne fait plus le dispatch ici pour ne pas bloquer la transaction
 * sur un canal externe (Resend, Web Push) qui peut latence / échouer.
 */
async function qualifyInTransaction(
  tx: PrismaTx,
  params: {
    referralId: string;
    referrerId: string;
    refereeId: string;
    dealsPublished: number;
    listingsPublished: number;
  },
): Promise<PendingNotification[]> {
  const { referralId, referrerId, refereeId, dealsPublished, listingsPublished } =
    params;

  // On re-vérifie le statut dans la transaction (anti-race).
  const fresh = await tx.referral.findUnique({
    where: { id: referralId },
    select: { status: true },
  });
  if (!fresh || fresh.status !== ReferralStatus.PENDING) return [];

  await tx.referral.update({
    where: { id: referralId },
    data: {
      status: ReferralStatus.QUALIFIED,
      qualifiedAt: new Date(),
      dealsPublished,
      listingsPublished,
    },
  });

  // Récupère (ou crée) le profil du parrain. On évite d'appeler
  // `getOrCreateAffiliateProfile` ici car elle utilise `prisma` direct
  // hors transaction ; on duplique la logique minimale pour rester
  // dans la même transaction.
  let affiliate = await tx.affiliateProfile.findUnique({
    where: { userId: referrerId },
  });
  if (!affiliate) {
    // Cas rare : le parrain n'a jamais visité /profil/affiliation après
    // s'être partagé son lien. On fait un stub, l'UI s'en chargera pour
    // raffiner le code si besoin (mais l'unicité impose un code ici).
    // On skippe silencieusement pour éviter une contrainte unique ratée
    // — le parrainage reste QUALIFIED, juste les compteurs ne bougent
    // pas tant que le parrain n'a pas matérialisé son profil.
    logger.warn("affiliate.qualify.no_profile_for_referrer", { referrerId });
    return [];
  }

  const previousCount = affiliate.qualifiedCount;
  const newCount = previousCount + 1;

  // Paliers franchis (normalement un seul à la fois, mais on supporte le
  // cas "plusieurs paliers franchis d'un coup" si jamais plusieurs
  // qualifications tombaient simultanément).
  const newlyReached = tiersReachedBetween(previousCount, newCount);
  const totalTierRewardCents = newlyReached.reduce(
    (s, t) => s + t.rewardCents,
    0,
  );
  const highestThresholdReached = newlyReached.at(-1)?.threshold ?? affiliate.tierReached;

  // Bonus 1er filleul qualifié (one-shot)
  const firstBonusCents =
    !affiliate.firstBonusAwarded && newCount >= 1 ? FIRST_REFEREE_BONUS_CENTS : 0;

  const totalRewardCents = totalTierRewardCents + firstBonusCents;

  affiliate = await tx.affiliateProfile.update({
    where: { id: affiliate.id },
    data: {
      qualifiedCount: { increment: 1 },
      tierReached:
        highestThresholdReached > affiliate.tierReached
          ? highestThresholdReached
          : affiliate.tierReached,
      totalEarnedCents: { increment: totalRewardCents },
      pendingPayoutCents: { increment: totalRewardCents },
      firstBonusAwarded: affiliate.firstBonusAwarded || firstBonusCents > 0,
    },
  });

  // On prépare les notifications à dispatcher après commit (push +
  // email + in-app). Elles ne sont pas écrites via tx.notification.create
  // ici — dispatchNotification fera la row in-app lui-même, c'est la
  // source de vérité unique pour tout le pipeline notifs.
  const pending: PendingNotification[] = [];

  pending.push({
    userId: referrerId,
    type: NotificationType.REFERRAL_QUALIFIED,
    title: "Un filleul vient de se qualifier ✨",
    message:
      firstBonusCents > 0
        ? `Bravo ! Tu touches ${formatCents(firstBonusCents)} de bonus de bienvenue.`
        : "Il a publié 5 bons plans et 5 annonces. Continue comme ça !",
    actionPath: "/profil/affiliation",
    fromUserId: refereeId,
  });

  for (const tier of newlyReached) {
    pending.push({
      userId: referrerId,
      type: NotificationType.AFFILIATE_TIER_REACHED,
      title: `🎉 ${tier.label}`,
      message: `Tu viens de gagner ${formatCents(tier.rewardCents)}. Total à reverser : ${formatCents(affiliate.pendingPayoutCents)}.`,
      actionPath: "/profil/affiliation",
    });
  }

  return pending;
}

/**
 * Marque comme EXPIRED les parrainages dont la fenêtre de qualification
 * est échue. À appeler depuis un cron (ou un route handler déclenché par
 * Vercel Cron / Supabase edge scheduler). Retourne le nombre de lignes
 * affectées.
 */
export async function expireLapsedReferrals(): Promise<number> {
  const res = await prisma.referral.updateMany({
    where: {
      status: ReferralStatus.PENDING,
      expiresAt: { lt: new Date() },
    },
    data: { status: ReferralStatus.EXPIRED },
  });
  return res.count;
}
