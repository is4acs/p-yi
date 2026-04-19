import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/log";
import { env } from "@/lib/env";
import { dispatchNotification } from "@/lib/notifications/dispatch";
import { NotificationType } from "@prisma/client";

/**
 * Cron quotidien : prévient chaque vendeur quand une de ses annonces
 * PUBLISHED va expirer dans 3 jours.
 *
 * Design :
 *   - On cible strictement la fenêtre ]J+3 ; J+4[. Un cron qui tourne
 *     tous les jours à la même heure (03:00 UTC, cf. vercel.json) voit
 *     exactement une fois chaque annonce — pas besoin de flag anti-
 *     doublon, la fenêtre temporelle fait office de dedup.
 *   - On n'envoie qu'une notif par listing, pas par jour. Si le cron
 *     échoue un jour (Vercel outage), on loupe le rappel — acceptable
 *     pour une feature soft.
 *   - Notif dispatchée via le pipeline unifié → in-app + push + email
 *     selon prefs user.
 *
 * Wiring Vercel : ajouté à `vercel.json` sur le même schedule quotidien
 * que expire-listings, quelques minutes plus tard pour rester court.
 *
 * Auth : même CRON_SECRET Bearer que les autres handlers cron.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    if (env.NODE_ENV !== "production") return true;
    return false;
  }
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const now = new Date();
  const windowStart = new Date(now.getTime() + 3 * DAY_MS);
  const windowEnd = new Date(now.getTime() + 4 * DAY_MS);

  try {
    const listings = await prisma.listing.findMany({
      where: {
        status: "PUBLISHED",
        expiresAt: { gte: windowStart, lt: windowEnd },
      },
      select: {
        id: true,
        slug: true,
        title: true,
        authorId: true,
        expiresAt: true,
      },
    });

    let sent = 0;
    for (const l of listings) {
      const daysLeft = Math.max(
        1,
        Math.round((l.expiresAt.getTime() - now.getTime()) / DAY_MS),
      );
      await dispatchNotification({
        userId: l.authorId,
        type: NotificationType.LISTING_EXPIRING,
        title: `Ton annonce expire dans ${daysLeft} jour${daysLeft > 1 ? "s" : ""}`,
        message: `« ${l.title.slice(0, 80)}${
          l.title.length > 80 ? "…" : ""
        } » — pense à la reposter ou à la modifier si le bien est toujours dispo.`,
        actionPath: `/annonces/${l.slug}`,
        listingId: l.id,
        pushTag: `listing-expiring:${l.id}`,
      }).catch((err) => {
        logger.warn("cron.expiring-listings.dispatch-failed", {
          listingId: l.id,
          err: err instanceof Error ? err.message : String(err),
        });
      });
      sent += 1;
    }

    logger.info("cron.expiring-listings", { scanned: listings.length, sent });
    return NextResponse.json({ scanned: listings.length, sent });
  } catch (err) {
    logger.error("cron.expiring-listings.failed", { err });
    return new NextResponse("internal error", { status: 500 });
  }
}
