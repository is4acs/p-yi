import { AlertType, NotificationType, type Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/log";

import { dispatchNotification } from "./dispatch";

/**
 * Alert matching — notifie les utilisateurs qui ont créé une alerte
 * dont les critères matchent un nouveau deal / une nouvelle annonce.
 *
 * Stratégie :
 *   1. Charger toutes les alertes actives compatibles avec le type (DEAL,
 *      LISTING, BOTH)
 *   2. Pre-filtrer en DB sur categoryId et cityId quand ils sont posés
 *      (réduit le volume à scanner côté Node)
 *   3. En mémoire, matcher les keywords (ILIKE) contre le title +
 *      description, et appliquer les filtres de prix
 *   4. Pour chaque match, dispatch une notif + bump le compteur de
 *      l'alerte (lastMatchAt + matchCount)
 *
 * Perf : à l'échelle Péyi (quelques milliers d'alertes max au début),
 * un scan linéaire reste très rapide — chaque publication de deal /
 * listing déclenche ~1 query pour lister les alertes candidates + N
 * notifs. Quand on dépassera ~10k alertes actives, il faudra passer à
 * une stratégie inverse (index Meilisearch des keywords → match direct).
 *
 * Ne throw jamais : un échec ici ne doit pas annuler la publication.
 */

type MatchableDeal = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  price: Prisma.Decimal;
  categoryId: string;
  cityId: string | null;
  authorId: string;
};

type MatchableListing = {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: Prisma.Decimal | null;
  categoryId: string;
  cityId: string;
  authorId: string;
};

function normalize(s: string): string {
  // Minuscule, sans accent, espaces simples. Permet de matcher "iphone"
  // avec "iPhone" ou "Iphône" sans exploser les combinaisons.
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function keywordsMatch(
  haystack: string,
  keywords: string[],
): string | null {
  const normalized = normalize(haystack);
  for (const kw of keywords) {
    const needle = normalize(kw);
    if (needle.length === 0) continue;
    if (normalized.includes(needle)) return kw;
  }
  return null;
}

export async function matchAlertsForDeal(deal: MatchableDeal): Promise<void> {
  try {
    const alerts = await prisma.alert.findMany({
      where: {
        isActive: true,
        type: { in: [AlertType.DEAL, AlertType.BOTH] },
        // On exclut l'auteur : il ne doit pas recevoir d'alerte sur son
        // propre post. Réduit la queue inutile et évite le cas
        // self-notify trop fréquent si l'user a posé une alerte large.
        NOT: { userId: deal.authorId },
        OR: [
          { categoryId: null },
          { categoryId: deal.categoryId },
        ],
        AND: [
          { OR: [{ cityId: null }, { cityId: deal.cityId }] },
        ],
      },
      select: {
        id: true,
        userId: true,
        name: true,
        keywords: true,
        minPrice: true,
        maxPrice: true,
      },
    });

    const haystack = `${deal.title} ${deal.description ?? ""}`;
    const now = new Date();
    const matched: { alertId: string; userId: string; name: string; keyword: string }[] = [];

    for (const alert of alerts) {
      if (alert.keywords.length > 0) {
        const kw = keywordsMatch(haystack, alert.keywords);
        if (!kw) continue;
        matched.push({ alertId: alert.id, userId: alert.userId, name: alert.name, keyword: kw });
      } else {
        // Alerte sans keywords = alerte catégorie/ville pure : on match
        // tous les deals qui arrivent dans son scope.
        matched.push({ alertId: alert.id, userId: alert.userId, name: alert.name, keyword: "" });
      }
      // Filtres de prix (s'appliquent sur la Decimal Prisma en toute
      // précision).
      const last = matched[matched.length - 1];
      if (alert.minPrice && deal.price.lt(alert.minPrice)) {
        matched.pop();
        continue;
      }
      if (alert.maxPrice && deal.price.gt(alert.maxPrice)) {
        matched.pop();
        continue;
      }
      void last;
    }

    if (matched.length === 0) return;

    // Bump counters puis dispatch. updateMany est batched en un seul
    // round-trip.
    await prisma.alert.updateMany({
      where: { id: { in: matched.map((m) => m.alertId) } },
      data: { lastMatchAt: now, matchCount: { increment: 1 } },
    });

    for (const m of matched) {
      await dispatchNotification({
        userId: m.userId,
        type: NotificationType.ALERT_MATCH,
        title: `Nouveau bon plan pour ton alerte « ${m.name} »`,
        message: `${deal.title}`,
        actionPath: `/bons-plans/${deal.slug}`,
        dealId: deal.id,
        pushTag: `alert:${m.alertId}:${deal.id}`,
      }).catch((err) => {
        logger.warn("alerts.dispatch.failed", {
          alertId: m.alertId,
          err: err instanceof Error ? err.message : String(err),
        });
      });
    }
  } catch (err) {
    // Silencieux côté métier : l'échec d'alerting ne doit pas casser la
    // publication qui vient d'arriver. On log pour ops.
    logger.error("alerts.match.deal.failed", {
      dealId: deal.id,
      err: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function matchAlertsForListing(
  listing: MatchableListing,
): Promise<void> {
  try {
    const alerts = await prisma.alert.findMany({
      where: {
        isActive: true,
        type: { in: [AlertType.LISTING, AlertType.BOTH] },
        NOT: { userId: listing.authorId },
        OR: [
          { categoryId: null },
          { categoryId: listing.categoryId },
        ],
        AND: [
          { OR: [{ cityId: null }, { cityId: listing.cityId }] },
        ],
      },
      select: {
        id: true,
        userId: true,
        name: true,
        keywords: true,
        minPrice: true,
        maxPrice: true,
      },
    });

    const haystack = `${listing.title} ${listing.description}`;
    const now = new Date();
    const matched: { alertId: string; userId: string; name: string }[] = [];

    for (const alert of alerts) {
      // Keywords obligatoires ou catégorie pure
      if (alert.keywords.length > 0) {
        if (!keywordsMatch(haystack, alert.keywords)) continue;
      }
      // Filtre de prix : si le listing n'a pas de prix (DONATION,
      // EXCHANGE), on le laisse passer — l'user peut vouloir être notifié
      // des dons même s'il a posé un maxPrice.
      if (listing.price != null) {
        if (alert.minPrice && listing.price.lt(alert.minPrice)) continue;
        if (alert.maxPrice && listing.price.gt(alert.maxPrice)) continue;
      }
      matched.push({ alertId: alert.id, userId: alert.userId, name: alert.name });
    }

    if (matched.length === 0) return;

    await prisma.alert.updateMany({
      where: { id: { in: matched.map((m) => m.alertId) } },
      data: { lastMatchAt: now, matchCount: { increment: 1 } },
    });

    for (const m of matched) {
      await dispatchNotification({
        userId: m.userId,
        type: NotificationType.ALERT_MATCH,
        title: `Nouvelle annonce pour ton alerte « ${m.name} »`,
        message: listing.title,
        actionPath: `/annonces/${listing.slug}`,
        listingId: listing.id,
        pushTag: `alert:${m.alertId}:${listing.id}`,
      }).catch((err) => {
        logger.warn("alerts.dispatch.failed", {
          alertId: m.alertId,
          err: err instanceof Error ? err.message : String(err),
        });
      });
    }
  } catch (err) {
    logger.error("alerts.match.listing.failed", {
      listingId: listing.id,
      err: err instanceof Error ? err.message : String(err),
    });
  }
}
