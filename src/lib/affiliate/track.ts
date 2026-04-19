import { headers } from "next/headers";

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/log";

import { hashIp, isValidCodeFormat } from "./code";

/**
 * Enregistre un clic d'affiliation en base et incrémente le compteur
 * du profil. Ne touche pas aux cookies — le `/r/[code]` route handler
 * pose le cookie directement sur sa `NextResponse` pour qu'il soit
 * présent même à travers un redirect.
 *
 * Protections :
 *  - Ignore les codes au format invalide (pas de DB scan)
 *  - Ignore les codes inconnus ou bannis
 *  - IP hashée (RGPD), dédoublonnage 1 h sur (code, ipHash) pour ne pas
 *    gonfler le compteur avec des rafraîchissements successifs
 *
 * Ne throw jamais : un échec de tracking ne doit pas casser la
 * redirection.
 */
export async function recordAffiliateClick(
  code: string,
  landingPath: string = "/",
): Promise<{ tracked: boolean; reason?: string }> {
  try {
    if (!isValidCodeFormat(code)) {
      return { tracked: false, reason: "invalid_format" };
    }

    const profile = await prisma.affiliateProfile.findUnique({
      where: { code },
      select: { id: true, isBanned: true },
    });
    if (!profile || profile.isBanned) {
      return { tracked: false, reason: "unknown_or_banned" };
    }

    const headerList = headers();
    const rawIp =
      headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headerList.get("x-real-ip") ||
      "";
    const ipHash = rawIp ? hashIp(rawIp, code) : null;
    const userAgent = headerList.get("user-agent") ?? null;
    const referrer = headerList.get("referer") ?? null;

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentDupe = ipHash
      ? await prisma.affiliateClick.findFirst({
          where: {
            code,
            ipHash,
            createdAt: { gte: oneHourAgo },
          },
          select: { id: true },
        })
      : null;

    if (!recentDupe) {
      await prisma.$transaction([
        prisma.affiliateClick.create({
          data: {
            code,
            ipHash,
            userAgent,
            referrer,
            landingPath,
          },
        }),
        prisma.affiliateProfile.update({
          where: { id: profile.id },
          data: { clicksCount: { increment: 1 } },
        }),
      ]);
    }

    return { tracked: true };
  } catch (err) {
    logger.error("affiliate.click.tracking_failed", {
      code,
      err: err instanceof Error ? err.message : String(err),
    });
    return { tracked: false, reason: "error" };
  }
}
