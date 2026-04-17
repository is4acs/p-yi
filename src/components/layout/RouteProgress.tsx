"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Thin orange bar at the very top of the viewport that animates while the app
 * is navigating between routes. Gives instant feedback on click, even before
 * the next route's `loading.tsx` has a chance to render.
 *
 * Works by:
 *  - Starting the bar on any same-origin link click or form submit.
 *  - Completing the bar when `usePathname` / `useSearchParams` report a
 *    change (meaning the new route has been rendered).
 */
export function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  // 1. When the route actually changes, finish the bar and fade it out.
  useEffect(() => {
    if (!loading) return;
    setProgress(100);
    const tid = window.setTimeout(() => {
      setLoading(false);
      setProgress(0);
    }, 250);
    return () => window.clearTimeout(tid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams?.toString()]);

  // 2. Intercept link clicks globally — start the bar as soon as the user commits.
  useEffect(() => {
    function isNavigableAnchor(el: HTMLAnchorElement): boolean {
      if (!el.href) return false;
      if (el.target === "_blank") return false;
      if (el.hasAttribute("download")) return false;
      const href = el.getAttribute("href") ?? "";
      if (
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:")
      ) {
        return false;
      }
      // External links leave the app — let the browser show its own spinner.
      try {
        const url = new URL(el.href, window.location.href);
        if (url.origin !== window.location.origin) return false;
        // Same URL as current → no nav will happen.
        if (url.href === window.location.href) return false;
      } catch {
        return false;
      }
      return true;
    }

    function onClick(e: MouseEvent) {
      // Respect modifier keys — user wants to open in new tab.
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (e.button !== 0) return;
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest("a") as HTMLAnchorElement | null;
      if (!anchor || !isNavigableAnchor(anchor)) return;
      start();
    }

    function onSubmit(e: SubmitEvent) {
      const form = e.target as HTMLFormElement | null;
      if (!form || form.tagName !== "FORM") return;
      // Only show the bar for non-GET submits, which typically mean Server Actions
      // or mutation endpoints. GET submits go to the target URL via the click path.
      const method = (form.method || "get").toLowerCase();
      if (method === "get") return;
      start();
    }

    function start() {
      setLoading(true);
      setProgress(20);
    }

    document.addEventListener("click", onClick, { capture: true });
    document.addEventListener("submit", onSubmit, { capture: true });
    return () => {
      document.removeEventListener("click", onClick, { capture: true });
      document.removeEventListener("submit", onSubmit, { capture: true });
    };
  }, []);

  // 3. While loading, let the bar creep forward so the user feels motion even if
  //    the navigation is slow (e.g. cold start, slow query). We cap at 90% until
  //    the real route-change effect completes the bar at 100%.
  useEffect(() => {
    if (!loading) return;
    const id = window.setInterval(() => {
      setProgress((p) => (p >= 90 ? p : Math.min(90, p + (90 - p) * 0.2)));
    }, 200);
    return () => window.clearInterval(id);
  }, [loading]);

  if (!loading && progress === 0) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5"
    >
      <div
        className="h-full bg-peyi-orange-500 shadow-[0_0_8px_rgba(242,112,36,0.6)] transition-[width,opacity] duration-200 ease-out"
        style={{
          width: `${progress}%`,
          opacity: loading || progress > 0 ? 1 : 0,
        }}
      />
    </div>
  );
}
