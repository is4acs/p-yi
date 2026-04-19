import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/log";
import { env } from "@/lib/env";

/**
 * Cron quotidien : passe à `status=EXPIRED` toutes les annonces dont
 * `expiresAt` est dans le passé mais qui sont encore `PUBLISHED`.
 *
 * Pourquoi c'est utile :
 *   - Les `listings` queries filtrent déjà `expiresAt > now()` donc
 *     le feed est propre en runtime. MAIS le champ `status` reste à
 *     `PUBLISHED`, ce qui pollue le sitemap, le dashboard admin, les
 *     compteurs dénormalisés sur le profil et toute query qui filtre
 *     par status sans penser à vérifier `expiresAt`.
 *   - Faire le flip ici, une fois par jour, évite de le faire dans
 *     chaque code-path. Les annonces apparaissent "Expirée" dans
 *     `/profil` du vendeur qui peut les re-booster.
 *
 * Sécurité :
 *   - Vercel appelle ce handler avec le header `Authorization: Bearer
 *     <CRON_SECRET>`. On vérifie la correspondance avec
 *     `process.env.CRON_SECRET` (défini en secret Vercel). Sans ça,
 *     n'importe qui pourrait trigger le job à la main.
 *   - En dev local, pas de secret = on autorise (log warning) pour
 *     pouvoir tester via `curl`.
 *
 * Wiring Vercel :
 *   - `vercel.json` déclare `{"crons": [{"path": "/api/cron/expire-listings",
 *     "schedule": "0 3 * * *"}]}` — 03:00 UTC tous les jours (minuit
 *     heure Guyane), créneau calme.
 *
 * Retour :
 *   200 + `{ expired: <n> }` si OK, 401 si auth invalide, 500 si DB fail.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // En dev sans secret on laisse passer pour faciliter les tests.
    if (env.NODE_ENV !== "production") return true;
    return false;
  }
  const header = req.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const result = await prisma.listing.updateMany({
      where: {
        status: "PUBLISHED",
        expiresAt: { lt: new Date() },
      },
      data: { status: "EXPIRED" },
    });

    logger.info("cron.expire-listings", { expired: result.count });
    return NextResponse.json({ expired: result.count });
  } catch (err) {
    logger.error("cron.expire-listings.failed", { err });
    return new NextResponse("internal error", { status: 500 });
  }
}
