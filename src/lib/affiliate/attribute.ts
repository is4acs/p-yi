import { cookies, headers } from "next/headers";

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/log";

import { AFFILIATE_COOKIE_NAME } from "./cookies";
import { hashIp, isValidCodeFormat } from "./code";
import { QUALIFICATION_WINDOW_DAYS } from "./tiers";

/**
 * Attribue un parrainage à un utilisateur nouvellement inscrit si un
 * cookie `peyi_ref` valide est présent. Idempotent : si une `Referral`
 * existe déjà pour ce filleul, on ne fait rien.
 *
 * Règles anti-abus :
 *  - Auto-parrainage interdit (un user ne peut pas se parrainer lui-même)
 *  - Le code doit exister et correspondre à un profil non banni
 *  - L'IP est hashée avec le code comme sel (pas d'IP en clair)
 *  - Le cookie est supprimé après utilisation (succès ou échec)
 *
 * À appeler juste après la création du `User` Prisma dans :
 *   - `/src/lib/auth/ensure-profile.ts` (OAuth avec username en metadata)
 *   - `/src/app/auth/complete-profile/actions.ts` (signup manuel)
 *
 * Ne throw jamais : un échec d'attribution ne doit pas casser le signup.
 */
export async function attributeReferralOnSignup(
  refereeId: string,
): Promise<{ attributed: boolean; reason?: string }> {
  try {
    const cookieStore = cookies();
    const refCookie = cookieStore.get(AFFILIATE_COOKIE_NAME);
    if (!refCookie?.value) {
      return { attributed: false, reason: "no_cookie" };
    }

    const code = refCookie.value;
    if (!isValidCodeFormat(code)) {
      return { attributed: false, reason: "invalid_format" };
    }

    // Déjà un parrain ? (contrainte @unique sur refereeId ferait échouer
    // le create de toute façon, mais on évite le round-trip)
    const existing = await prisma.referral.findUnique({
      where: { refereeId },
      select: { id: true },
    });
    if (existing) {
      return { attributed: false, reason: "already_attributed" };
    }

    const profile = await prisma.affiliateProfile.findUnique({
      where: { code },
      select: { id: true, userId: true, isBanned: true },
    });
    if (!profile) {
      return { attributed: false, reason: "unknown_code" };
    }
    if (profile.isBanned) {
      return { attributed: false, reason: "banned_referrer" };
    }
    if (profile.userId === refereeId) {
      return { attributed: false, reason: "self_referral" };
    }

    // Capture IP et User-Agent pour anti-fraude (IP hashée avec le code
    // comme sel, donc non corrélable entre parrains).
    const headerList = headers();
    const rawIp =
      headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headerList.get("x-real-ip") ||
      "";
    const signupIpHash = rawIp ? hashIp(rawIp, code) : null;
    const signupUserAgent = headerList.get("user-agent") ?? null;

    const expiresAt = new Date(
      Date.now() + QUALIFICATION_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    );

    await prisma.$transaction([
      prisma.referral.create({
        data: {
          referrerId: profile.userId,
          refereeId,
          code,
          expiresAt,
          signupIpHash,
          signupUserAgent,
        },
      }),
      prisma.affiliateProfile.update({
        where: { id: profile.id },
        data: { signupsCount: { increment: 1 } },
      }),
    ]);

    logger.info("affiliate.referral.attributed", {
      referrerId: profile.userId,
      refereeId,
      code,
    });

    return { attributed: true };
  } catch (err) {
    logger.error("affiliate.referral.attribution_failed", {
      refereeId,
      err: err instanceof Error ? err.message : String(err),
    });
    return { attributed: false, reason: "error" };
  }
}

/**
 * Nettoie le cookie de parrainage. À appeler après une attribution
 * réussie, ou si l'attribution est explicitement impossible, pour
 * éviter de conserver un cookie périmé.
 *
 * NOTE : on ne peut supprimer un cookie que depuis une server action ou
 * une route handler (contrainte Next.js 14). Cette fonction est un
 * helper ; l'appelant doit être dans un contexte où `cookies().delete`
 * est autorisé (sinon elle échouera silencieusement — acceptable, le
 * cookie expirera de toute façon après 30 j).
 */
export function clearReferralCookie(): void {
  try {
    cookies().delete(AFFILIATE_COOKIE_NAME);
  } catch {
    // Context doesn't allow cookie mutation — ignored.
  }
}
