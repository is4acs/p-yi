import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/log";
import { isCronAuthorized } from "@/lib/cron/auth";
import {
  collectPurgeableDeals,
  markExpiredDeals,
  purgeDeals,
  resolveRetentionDays,
} from "@/lib/deals/expiry";
import { removeDealImages } from "@/lib/storage/deal-images";

/**
 * Cron quotidien de fin de vie des contenus. Remplace l'ancien
 * `/api/cron/expire-listings` en y ajoutant les bons plans.
 *
 * Ce qu'il fait, dans l'ordre :
 *   1. **Annonces** — `PUBLISHED` + `expiresAt` passé → `EXPIRED`.
 *      Les listes filtraient déjà sur `expiresAt`, mais le `status`
 *      restait `PUBLISHED` : ça polluait le sitemap, le dashboard
 *      admin et tous les compteurs. Le vendeur voit « Expirée » dans
 *      son profil et peut reposter.
 *   2. **Bons plans** — même marquage `PUBLISHED` → `EXPIRED`.
 *   3. **Purge des bons plans** — suppression définitive de ceux
 *      expirés depuis plus de `EXPIRED_DEAL_RETENTION_DAYS` jours
 *      (7 par défaut), images du bucket comprises.
 *
 * Les annonces ne sont volontairement PAS purgées : elles restent
 * consultables par leur auteur une fois expirées.
 *
 * Pourquoi un seul handler pour tout ça : le plan Vercel Hobby limite
 * un projet à 2 crons (cf. `docs/deployment.md`). On garde donc ce job
 * de maintenance + `expiring-listings` (les rappels J-3). La logique
 * bons plans vit dans `@/lib/deals/expiry`, partagée avec
 * `scripts/purge-expired-deals.ts` (rattrapage manuel du backlog).
 *
 * Sécurité : header `Authorization: Bearer <CRON_SECRET>` vérifié par
 * `isCronAuthorized` — fail-closed en production.
 *
 * Wiring Vercel : `vercel.json`, `0 3 * * *` (03:00 UTC, minuit heure
 * Guyane), créneau calme.
 *
 * Retour : 200 + `{ listingsExpired, dealsExpired, dealsPurged,
 * imagesRemoved }`, 401 si auth invalide, 500 si la DB casse.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const now = new Date();
  const retentionDays = resolveRetentionDays();

  try {
    const { count: listingsExpired } = await prisma.listing.updateMany({
      where: { status: "PUBLISHED", expiresAt: { lt: now } },
      data: { status: "EXPIRED" },
    });

    const dealsExpired = await markExpiredDeals(prisma, now);

    const candidates = await collectPurgeableDeals(prisma, {
      now,
      retentionDays,
    });
    const dealsPurged = await purgeDeals(prisma, candidates);

    // Nettoyage best-effort du bucket : une image orpheline coûte moins
    // cher qu'un cron qui casse après avoir supprimé les lignes.
    let imagesRemoved = 0;
    if (candidates.length > 0) {
      const urls = candidates.flatMap((c) => c.imageUrls);
      imagesRemoved = await removeDealImages(urls).catch((err) => {
        logger.warn("cron.expire-content.storage-cleanup-failed", {
          count: urls.length,
          err: err instanceof Error ? err.message : String(err),
        });
        return 0;
      });
    }

    // La page détail met le bon plan en cache 1h sous le tag
    // `deal:<slug>`. Elle 404 déjà sur un deal expiré (garde
    // `expiresAt`), mais le cache d'un deal supprimé n'a plus aucune
    // raison d'occuper de la place.
    for (const c of candidates) revalidateTag(`deal:${c.slug}`);

    logger.info("cron.expire-content", {
      listingsExpired,
      dealsExpired,
      dealsPurged,
      imagesRemoved,
      retentionDays,
    });
    return NextResponse.json({
      listingsExpired,
      dealsExpired,
      dealsPurged,
      imagesRemoved,
    });
  } catch (err) {
    logger.error("cron.expire-content.failed", { err });
    return new NextResponse("internal error", { status: 500 });
  }
}
