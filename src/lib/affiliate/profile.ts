import type { AffiliateProfile } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import { generateUniqueAffiliateCode } from "./code";
import { DEFAULT_MONTHLY_CAP_CENTS } from "./tiers";

/**
 * Récupère (ou crée à la volée) le profil d'affiliation d'un utilisateur.
 * Tout utilisateur a droit à son code dès l'inscription — on matérialise
 * le profil au premier accès à `/profil/affiliation` pour ne pas polluer
 * la table pour les comptes inactifs.
 *
 * Idempotent : appels concurrents protégés par la contrainte unique sur
 * `userId`.
 */
export async function getOrCreateAffiliateProfile(
  userId: string,
): Promise<AffiliateProfile> {
  const existing = await prisma.affiliateProfile.findUnique({
    where: { userId },
  });
  if (existing) return existing;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { username: true },
  });
  if (!user) {
    throw new Error(`User ${userId} not found, cannot create affiliate profile`);
  }

  const code = await generateUniqueAffiliateCode(user.username);

  try {
    return await prisma.affiliateProfile.create({
      data: {
        userId,
        code,
        monthlyCapCents: DEFAULT_MONTHLY_CAP_CENTS,
      },
    });
  } catch (err) {
    // Race: un autre appel concurrent a créé le profil entre notre
    // findUnique et notre create. On relit et renvoie.
    const fallback = await prisma.affiliateProfile.findUnique({
      where: { userId },
    });
    if (fallback) return fallback;
    throw err;
  }
}

/**
 * Construit l'URL d'invitation complète à partir d'un code. Utilise la
 * variable d'environnement `NEXT_PUBLIC_APP_URL` quand disponible, sinon
 * un fallback local.
 */
export function buildInviteUrl(code: string): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "https://peyi.app";
  return `${base}/r/${encodeURIComponent(code)}`;
}
