"use client";

import { useEffect } from "react";

/**
 * Registers the `/sw.js` service worker as soon as the app hydrates on a
 * supporting browser. Kept in its own component so the provider tree stays
 * flat — the layout only needs a single <ServiceWorkerRegister /> tag.
 *
 * We register in production ONLY to avoid fighting Next.js dev HMR (the SW
 * would serve stale bundles and break Fast Refresh). A developer can still
 * test the SW via `npm run build && npm run start`.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    // Delay registration until after the first paint so we never block
    // interactivity while downloading sw.js on slow connections.
    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        // Swallow — offline support is a progressive enhancement.
        console.error("[sw] registration failed", err);
      });
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
    }
  }, []);

  return null;
}
