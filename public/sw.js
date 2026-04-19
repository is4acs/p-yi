/* eslint-disable no-undef */
// Service Worker for Péyi PWA. Kept minimal on purpose :
//   - Strategy 1 (network-first with cache fallback) for HTML pages, so users
//     always get fresh content when online, and a cached page or the offline
//     shell when offline.
//   - Strategy 2 (stale-while-revalidate) for static assets (`/_next/static/`,
//     images, the generated /icon route) so navigations feel instant on
//     repeat visits.
//
// We deliberately do NOT cache API/auth/supabase/prisma/messages routes —
// messaging or profile data must always be fresh.
//
// Versioning : bump CACHE_VERSION whenever this file changes to invalidate
// the old caches on next activate.
const CACHE_VERSION = "peyi-v2";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const HTML_CACHE = `${CACHE_VERSION}-html`;
const OFFLINE_URL = "/offline";

// Assets precached at install time so the offline shell always works.
const PRECACHE_URLS = [OFFLINE_URL, "/icon", "/apple-icon"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(HTML_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Drop old-version caches so we don't keep stale JS/HTML around.
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

/**
 * Should this request be served by the service worker at all ?
 * We skip everything that isn't a same-origin GET, plus the auth/api
 * routes and Supabase calls — those must always go to the network.
 */
function shouldHandle(request) {
  if (request.method !== "GET") return false;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;
  if (url.pathname.startsWith("/api/")) return false;
  if (url.pathname.startsWith("/auth/")) return false;
  if (url.pathname.startsWith("/_next/data/")) return false;
  return true;
}

function isHtmlRequest(request) {
  const accept = request.headers.get("accept") || "";
  return request.mode === "navigate" || accept.includes("text/html");
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (!shouldHandle(request)) return;

  if (isHtmlRequest(request)) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Static assets (JS/CSS/images/icons) — cache with background refresh.
  event.respondWith(staleWhileRevalidate(request));
});

async function networkFirst(request) {
  try {
    const fresh = await fetch(request);
    // Only cache successful 2xx HTML responses.
    if (fresh.ok) {
      const cache = await caches.open(HTML_CACHE);
      cache.put(request, fresh.clone());
    }
    return fresh;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    const offline = await caches.match(OFFLINE_URL);
    if (offline) return offline;
    return new Response("Hors ligne", {
      status: 503,
      statusText: "Service Unavailable",
    });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);
  return cached || (await networkPromise) || new Response("", { status: 504 });
}

// ---------------------------------------------------------------------------
// Web Push
// ---------------------------------------------------------------------------
// Payload envoyé par /src/lib/notifications/push.ts : JSON { title, body,
// url, icon, tag }. On affiche une notif native + on gère le clic pour
// focuser/ouvrir l'URL cible.
//
// Résilience : si le payload est vide ou malformé, on affiche quand même
// une notif générique (sinon Chrome/Firefox affichent leur propre notif
// "site in background" qui est pire UX).

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }

  const title = data.title || "Péyi";
  const options = {
    body: data.body || "Tu as une nouvelle notification.",
    icon: data.icon || "/icon",
    badge: "/icon",
    tag: data.tag,
    data: { url: data.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target =
    (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      // Tentative : focuser une fenêtre ouverte sur la même origine et
      // la naviguer vers l'URL cible. Sinon ouvrir une nouvelle fenêtre.
      for (const client of allClients) {
        if (client.url.includes(self.location.origin)) {
          await client.focus();
          return client.navigate(target).catch(() => null);
        }
      }
      return self.clients.openWindow(target);
    })(),
  );
});

// `pushsubscriptionchange` : le navigateur a régénéré l'abonnement (p256dh
// renouvelé, notamment sur iOS Safari après un update majeur). On ré-inscrit
// silencieusement le nouveau endpoint. Sans ça, l'user "disparaît" du
// système de push sans warning.
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keyRes = await fetch("/api/notifications/vapid-key");
        if (!keyRes.ok) return;
        const { publicKey } = await keyRes.json();
        const sub = await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
        await fetch("/api/notifications/subscribe", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(sub.toJSON()),
        });
      } catch {
        // best-effort — si l'user est offline au moment du renouvellement,
        // on re-tentera au prochain mount côté page.
      }
    })(),
  );
});

// Décode une clé VAPID base64url en Uint8Array pour
// `pushManager.subscribe(applicationServerKey: …)`.
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = self.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}
