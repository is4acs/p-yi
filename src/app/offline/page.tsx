import Link from "next/link";
import type { Metadata } from "next";
import { RefreshCcw, WifiOff } from "lucide-react";

export const metadata: Metadata = {
  title: "Hors ligne",
  description:
    "Tu es actuellement hors connexion. Certaines pages restent accessibles.",
};

/**
 * Shown by the service worker when a navigation fails because the device is
 * offline and we have no cached copy of the requested page. Keep this file
 * tiny — the SW pre-caches it at install time, and it's the single page most
 * likely to render from the cache on a bad connection.
 */
export default function OfflinePage() {
  return (
    <main className="mx-auto flex max-w-md flex-col items-center px-4 pb-16 pt-16 text-center sm:pt-24">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-peyi-orange-100 text-peyi-orange-600">
        <WifiOff className="h-7 w-7" aria-hidden />
      </span>
      <h1 className="mt-4 font-display text-2xl font-bold tracking-tight sm:text-3xl">
        Hors connexion
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        On dirait que tu n&apos;as plus de réseau. Vérifie ta 4G ou ton WiFi
        puis réessaie.
      </p>

      <div className="mt-6 flex flex-col gap-2">
        <a
          href="/"
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md bg-peyi-orange-500 px-4 text-sm font-semibold text-white transition hover:bg-peyi-orange-600"
        >
          <RefreshCcw className="h-4 w-4" aria-hidden />
          Réessayer
        </a>
        <Link
          href="/bons-plans"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Voir les bons plans en cache
        </Link>
      </div>
    </main>
  );
}
