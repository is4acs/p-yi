import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { headers } from "next/headers";

import { env } from "@/lib/env";

/**
 * Rate limiting via Upstash Redis (REST API, compatible edge + Node).
 *
 * Design :
 *  - 3 buckets exposés : `authLimiter`, `writeLimiter`, `reportLimiter`.
 *    Chacun est un `Ratelimit` pré-configuré avec sa fenêtre et sa clé.
 *  - Algorithme sliding window : plus fluide que fixed window, évite le
 *    pic de trafic à chaque changement de minute.
 *  - Dégrade proprement en dev/test : si `UPSTASH_REDIS_REST_URL` ou
 *    `UPSTASH_REDIS_REST_TOKEN` manque (typique en dev local sans Redis),
 *    tous les limiters sont remplacés par un no-op qui autorise tout.
 *    Un warning est loggé une seule fois.
 *  - En **production**, `src/lib/env.ts` refuse de booter sans Upstash
 *    (sauf si `ALLOW_NO_RATE_LIMIT=1` est posé explicitement). Donc en
 *    pratique, le no-op n'est atteint en prod qu'avec opt-in volontaire.
 *  - L'`analytics: true` du Ratelimit expose des métriques dans le
 *    dashboard Upstash — pratique pour monitorer les abus en prod.
 *
 * Usage typique dans une server action :
 * ```ts
 * const { success } = await authLimiter.limit(await getClientIp());
 * if (!success) redirectWithError("/connexion", "Trop de tentatives…");
 * ```
 */

const REDIS_URL = env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = env.UPSTASH_REDIS_REST_TOKEN;

let warnedMissing = false;
function warnMissingOnce() {
  if (warnedMissing) return;
  warnedMissing = true;
  // eslint-disable-next-line no-console
  console.warn(
    "[rate-limit] UPSTASH_REDIS_REST_URL/TOKEN manquant — rate limiting désactivé. " +
      "OK en dev/test. En prod, env.ts bloque le boot (sauf ALLOW_NO_RATE_LIMIT=1).",
  );
}

/**
 * Limiter no-op pour les environnements sans Redis. Conserve la même
 * shape que `Ratelimit.limit()` pour que les call sites n'aient rien à
 * changer entre dev et prod.
 */
const noopLimiter = {
  limit: async (identifier: string) => {
    // `identifier` ne sert à rien ici mais on garde la signature identique
    // à celle de `Ratelimit.limit` pour que le code appelant ne change pas.
    void identifier;
    return {
      success: true as const,
      limit: Infinity,
      remaining: Infinity,
      reset: Date.now() + 60_000,
      pending: Promise.resolve(),
    };
  },
};

type LimiterLike = typeof noopLimiter | Ratelimit;

function makeLimiter(
  prefix: string,
  tokens: number,
  window: Parameters<typeof Ratelimit.slidingWindow>[1],
): LimiterLike {
  if (!REDIS_URL || !REDIS_TOKEN) {
    warnMissingOnce();
    return noopLimiter;
  }
  const redis = new Redis({ url: REDIS_URL, token: REDIS_TOKEN });
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(tokens, window),
    analytics: true,
    prefix: `peyi:${prefix}`,
  });
}

/**
 * Actions d'authentification (signIn, signUp, OAuth, OTP). Clé = IP.
 * 5 tentatives toutes les 10 minutes : laisse de la marge pour les
 * fautes de frappe mais bloque une attaque par brute force.
 */
export const authLimiter = makeLimiter("auth", 5, "10 m");

/**
 * Actions d'écriture coûteuses (création d'annonce, de bon plan, de
 * commentaire). Clé = userId. 10 actions par minute : largement
 * suffisant pour un usage humain, bloque un bot spammeur.
 */
export const writeLimiter = makeLimiter("write", 10, "1 m");

/**
 * Signalements (S21). Clé = userId. 5 reports par heure : évite qu'un
 * utilisateur malveillant flood la modération.
 */
export const reportLimiter = makeLimiter("report", 5, "1 h");

/**
 * Export RGPD (portabilité). Clé = userId. 1 export toutes les 24 h :
 * l'export est coûteux (lit ~10 tables en parallèle, sérialise tout
 * le contenu de l'utilisateur), donc on limite fortement pour éviter
 * qu'un compte compromis vide la base via exports répétés. 24 h
 * correspond à la promesse qu'on fait déjà à l'utilisateur dans le
 * hub /profil/confidentialite ("une fois par 24 heures").
 */
export const exportLimiter = makeLimiter("export", 1, "24 h");

/**
 * Endpoints télémetrie publics non authentifiés (`/api/client-errors`,
 * `/api/metrics`). Clé = IP. 60 events par minute : largement
 * suffisant pour un user normal qui crash quelques fois et envoie ses
 * Web Vitals à chaque navigation, mais bloque un attaquant qui tente
 * de gonfler les logs ou la facture observabilité. Ces endpoints
 * tournent en `runtime: nodejs` derrière Vercel mais Vercel ne plafonne
 * pas par IP — d'où ce limiter applicatif.
 */
export const telemetryLimiter = makeLimiter("telemetry", 60, "1 m");

/**
 * Extrait l'IP cliente depuis les en-têtes de la request courante.
 *
 * Ordre de préférence :
 *  1. `x-forwarded-for` (premier IP de la liste = client réel, le reste
 *     c'est la chaîne de proxies). Vercel, Cloudflare et la plupart des
 *     PaaS remplissent correctement.
 *  2. `x-real-ip` (Nginx, quelques autres).
 *  3. `cf-connecting-ip` (Cloudflare direct si pas derrière un autre
 *     proxy).
 *  4. `"unknown"` en dernier recours — provoquera un partage de bucket
 *     entre tous les clients non identifiés, ce qui est acceptable en
 *     tant que mesure de protection extrême (ils se couperont les uns
 *     les autres mais c'est mieux que rien).
 *
 * ⚠️ Cette fonction ne peut être appelée que dans un contexte où
 * `headers()` est disponible (server action, RSC, route handler).
 */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  if (xff) {
    // xff peut contenir plusieurs IP séparées par des virgules — la première
    // est le client d'origine, les suivantes la chaîne de proxies.
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const xri = h.get("x-real-ip");
  if (xri) return xri.trim();
  const cfi = h.get("cf-connecting-ip");
  if (cfi) return cfi.trim();
  return "unknown";
}

/**
 * `true` si Upstash est configuré. Utile pour skipper les tests en dev
 * ou afficher un badge de débogage.
 */
export function isRateLimitingAvailable(): boolean {
  return Boolean(REDIS_URL && REDIS_TOKEN);
}
