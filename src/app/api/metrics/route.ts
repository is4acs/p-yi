import { logger } from "@/lib/log";
import { getClientIp, telemetryLimiter } from "@/lib/rate-limit";

/**
 * Endpoint de collecte des Core Web Vitals envoyés par le client
 * via `components/analytics/WebVitals.tsx` (sendBeacon ou fetch
 * keepalive). On se contente de logger — l'observability pipeline
 * (Vercel logs / Datadog / Grafana) fait le reste.
 *
 * Pourquoi pas de persistance DB ?
 *   - Volume potentiel élevé (chaque page view émet LCP + INP + CLS
 *     + FCP + TTFB = 5 métriques). À l'échelle Péyi, ça reste
 *     gérable, mais stocker en DB n'apporte rien vs. un outil
 *     d'observability : on ne fait pas d'analytics business là-dessus.
 *   - Les logs stdout sont gratuits, résilients, exportables.
 *
 * Sécurité :
 *   - Pas d'auth : les Web Vitals sont par design anonymes et
 *     publics. Le pire qu'un attaquant puisse faire, c'est spammer
 *     nos logs — on applique `telemetryLimiter` (60 req/min/IP)
 *     pour éviter l'abus.
 *   - Aucun champ PII n'est loggé : on reçoit `name`, `value`,
 *     `rating`, `delta`, `id`, `navigationType`, `url` (chemin).
 *     Pas de user id, pas d'email, pas de cookie — rien à exposer.
 *
 * HTTP :
 *   - `204 No Content` si OK. Pas de body attendu côté client.
 *   - `204` aussi en cas d'erreur ou de rate limit : métriques
 *     best-effort, on ne veut pas que le client retry et on ne
 *     révèle pas la limite côté attaquant.
 */
export const runtime = "nodejs";

type WebVitalBody = {
  name?: string;
  value?: number;
  rating?: string;
  delta?: number;
  id?: string;
  navigationType?: string;
  url?: string;
};

export async function POST(req: Request) {
  try {
    const ip = await getClientIp();
    const { success } = await telemetryLimiter.limit(ip);
    if (!success) {
      // Drop silencieusement pour rester fire-and-forget.
      return new Response(null, { status: 204 });
    }

    const payload = (await req.json()) as WebVitalBody;

    // Validation légère : on accepte les métriques "raisonnables"
    // et on ignore silencieusement le reste. Pas besoin d'un
    // schéma Zod complet ici — l'endpoint est trusted-ish (origine
    // same-origin via sendBeacon) et le pire cas est un log
    // malformé.
    if (!payload.name || typeof payload.value !== "number") {
      return new Response(null, { status: 204 });
    }

    logger.info("web-vital", {
      name: payload.name,
      value: Math.round(payload.value * 1000) / 1000,
      rating: payload.rating,
      delta: payload.delta,
      id: payload.id,
      navigationType: payload.navigationType,
      url: payload.url,
    });
  } catch {
    // Payload invalide, unreachable JSON, etc. Rien à faire — on
    // renvoie 204 pour que le client n'insiste pas.
  }
  return new Response(null, { status: 204 });
}
