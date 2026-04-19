import webpush, { type PushSubscription as WebPushSubscription } from "web-push";

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/log";

/**
 * Web Push — envoie des notifications natives à l'OS via VAPID.
 *
 * VAPID keys : générées une seule fois via `npx web-push generate-vapid-keys`,
 * stockées dans les secrets Vercel. `NEXT_PUBLIC_VAPID_PUBLIC_KEY` est
 * exposé au client pour la souscription, `VAPID_PRIVATE_KEY` reste serveur.
 *
 * Fallbacks :
 *  - Si les clés ne sont pas configurées, les fonctions `send*` font un
 *    no-op + warning (dev sans setup VAPID = pas de crash).
 *  - Si un endpoint retourne 404/410 (Gone), on le supprime automatiquement
 *    — c'est Apple/Google qui nous dit que l'abonnement n'est plus valide.
 *
 * Sécurité :
 *  - Pas de PII dans le payload push (les navigateurs peuvent le logger
 *    côté browser). On reste à titre + body court + URL cible.
 *  - TTL de 86400 (24h) : passé ce délai, le push est expiré — inutile
 *    de réveiller un téléphone pour un message d'hier.
 */

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT || "mailto:contact@peyi.gf";

let configured = false;
function ensureConfigured(): boolean {
  if (configured) return true;
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return false;
  }
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
  configured = true;
  return true;
}

export type PushPayload = {
  title: string;
  body: string;
  /** URL cliquable côté client (service worker fait le focus/openWindow). */
  url?: string;
  /** Icône custom (défaut : icône PWA Péyi servie par `/icon`). */
  icon?: string;
  /** ID pour dédupliquer / regrouper les pushs (ex. même conversation). */
  tag?: string;
};

export function isPushConfigured(): boolean {
  return Boolean(VAPID_PUBLIC && VAPID_PRIVATE);
}

export function getPublicVapidKey(): string | null {
  return VAPID_PUBLIC ?? null;
}

/**
 * Envoie un push à un utilisateur sur tous ses devices souscrits.
 * Best-effort : on swallow les erreurs individuelles pour ne pas
 * bloquer les autres devices si un endpoint échoue.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<{ sent: number; removed: number }> {
  if (!ensureConfigured()) {
    logger.warn("push.not-configured", { userId });
    return { sent: 0, removed: 0 };
  }

  const subs = await prisma.pushSubscription.findMany({
    where: { userId },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });

  if (subs.length === 0) {
    return { sent: 0, removed: 0 };
  }

  const stringPayload = JSON.stringify(payload);
  let sent = 0;
  const deadEndpoints: string[] = [];

  await Promise.all(
    subs.map(async (sub) => {
      const target: WebPushSubscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      };
      try {
        await webpush.sendNotification(target, stringPayload, {
          TTL: 60 * 60 * 24,
        });
        sent += 1;
      } catch (err: unknown) {
        const statusCode =
          typeof err === "object" && err != null && "statusCode" in err
            ? Number((err as { statusCode?: number }).statusCode)
            : null;
        if (statusCode === 404 || statusCode === 410) {
          // L'endpoint a été révoqué par le navigateur (user a désinstallé
          // l'app ou révoqué la permission). On dégage la row.
          deadEndpoints.push(sub.endpoint);
        } else {
          logger.warn("push.send-failed", {
            userId,
            endpoint: sub.endpoint.slice(0, 60),
            statusCode,
          });
        }
      }
    }),
  );

  if (deadEndpoints.length > 0) {
    await prisma.pushSubscription.deleteMany({
      where: { endpoint: { in: deadEndpoints } },
    });
  }

  return { sent, removed: deadEndpoints.length };
}
