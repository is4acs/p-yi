"use client";

import { useReportWebVitals } from "next/web-vitals";

/**
 * Reporter Core Web Vitals. Utilise `useReportWebVitals` exposé par
 * Next 14 — le hook est monté une seule fois, au niveau du root
 * layout, et reçoit les métriques (LCP, INP, CLS, FCP, TTFB, FID…)
 * au fur et à mesure qu'elles sont mesurées par le navigateur.
 *
 * Stratégie d'envoi :
 *   - Dev : on log simplement dans la console (on veut voir les
 *     valeurs pendant le développement, pas spammer notre endpoint).
 *   - Prod : on POST via `navigator.sendBeacon` vers `/api/metrics`.
 *     `sendBeacon` est le bon outil : il garantit la livraison
 *     même quand la page est en train d'être fermée (ce qui est
 *     souvent le cas avec les métriques Web Vitals mesurées au
 *     `visibilitychange` / `pagehide`). Fallback `fetch` + `keepalive`
 *     si le navigateur ne supporte pas sendBeacon (vieux Safari).
 *
 * Côté serveur (cf. `/api/metrics`), on se contente de logger via
 * le structured logger — ça atterrit en stdout, prêt à être scrapé
 * par Vercel / Datadog / Grafana sans code supplémentaire.
 *
 * Pourquoi ne pas intégrer Vercel Speed Insights / @vercel/analytics
 * directement ? On garde une implémentation vendor-neutral pour ne
 * pas lier le projet à un hébergeur. Si on migre un jour de Vercel
 * vers Fly.io/Railway/autre, ce code continuera de fonctionner
 * tel quel.
 */
export function WebVitals() {
  useReportWebVitals((metric) => {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.log("[web-vitals]", metric.name, Math.round(metric.value), metric);
      return;
    }

    const body = JSON.stringify({
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id,
      navigationType: metric.navigationType,
      // URL + user agent servent à segmenter par page et par device.
      url: window.location.pathname + window.location.search,
    });

    try {
      if (
        typeof navigator !== "undefined" &&
        typeof navigator.sendBeacon === "function"
      ) {
        const blob = new Blob([body], { type: "application/json" });
        navigator.sendBeacon("/api/metrics", blob);
        return;
      }
    } catch {
      // On retombe sur fetch ci-dessous.
    }

    // Fallback — `keepalive` permet à la requête de survivre au
    // unload de la page. Limite : 64 KB de body, mais on envoie
    // ~200 octets donc on est tranquille.
    void fetch("/api/metrics", {
      method: "POST",
      body,
      headers: { "Content-Type": "application/json" },
      keepalive: true,
    }).catch(() => {
      // Métriques best-effort : on ne retry pas, on ne remonte
      // pas d'erreur à l'utilisateur.
    });
  });

  return null;
}
