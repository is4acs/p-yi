"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";

/**
 * Page d'erreur au niveau application. Next la monte automatiquement quand
 * un segment **autre que le root layout** lève une exception non catchée.
 * Si le root layout lui-même crashe, c'est `global-error.tsx` qui prend le
 * relai (il remonte son propre `<html>`/`<body>`).
 *
 * On doit être un Client Component (`"use client"`) parce que `reset()` est
 * une closure côté client fournie par Next — elle tente de re-render le
 * segment qui a crashé.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const localTime = new Date().toLocaleString("fr-GF", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  useEffect(() => {
    // Console pour le dev (overlay Next) + POST vers
    // `/api/client-errors` pour que l'erreur soit capturée par le
    // logger structuré serveur. `error.digest` permet de corréler
    // avec les logs serveur si l'erreur vient d'un RSC crashé.
    // Best-effort : `keepalive` survit à une navigation, `catch`
    // swallow pour ne pas produire une erreur secondaire.
    // eslint-disable-next-line no-console
    console.error("[app/error]", error);

    if (typeof window === "undefined") return;
    const body = JSON.stringify({
      message: error.message,
      digest: error.digest,
      stack: error.stack,
      url: window.location.pathname + window.location.search,
    });
    void fetch("/api/client-errors", {
      method: "POST",
      body,
      headers: { "Content-Type": "application/json" },
      keepalive: true,
    }).catch(() => {
      /* swallow */
    });
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-12 text-center sm:max-w-2xl">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
        <AlertTriangle className="h-8 w-8 text-red-500" aria-hidden />
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-red-600">
        Oups
      </p>
      <h1 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl">
        Quelque chose s&apos;est mal passé
      </h1>
      <p className="mt-3 max-w-sm text-sm text-muted-foreground sm:text-base">
        Une erreur inattendue est survenue. Tu peux réessayer ou revenir à
        l&apos;accueil.
      </p>

      {error.digest && (
        <p className="mt-2 text-xs text-muted-foreground">
          Code de suivi : <code className="font-mono">{error.digest}</code>
        </p>
      )}
      <p className="mt-1 text-xs text-muted-foreground">
        Heure locale : <code className="font-mono">{localTime}</code>
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-10 items-center gap-1.5 rounded-full bg-peyi-orange-500 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-peyi-orange-600"
        >
          <RotateCcw className="h-4 w-4" aria-hidden />
          Réessayer
        </button>
        {/*
          `reset()` re-render le segment cassé, ce qui relance potentiellement
          le même bug et reboucle sur cette page. Un hard reload casse la
          boucle : nouveau RSC côté serveur, cache Next purgé, state client
          remis à zéro. On le garde derrière le bouton principal pour ne pas
          détourner du cas nominal mais il sauve l'utilisateur si le reset
          échoue deux fois.
        */}
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined") window.location.reload();
          }}
          className="inline-flex h-10 items-center gap-1.5 rounded-full border border-border bg-background px-4 text-sm font-semibold text-foreground transition hover:border-peyi-orange-300"
        >
          Recharger la page
        </button>
        <Link
          href="/"
          className="inline-flex h-10 items-center gap-1.5 rounded-full border border-border bg-background px-4 text-sm font-semibold text-foreground transition hover:border-peyi-orange-300"
        >
          <Home className="h-4 w-4" aria-hidden />
          Retour à l&apos;accueil
        </Link>
      </div>
    </main>
  );
}
