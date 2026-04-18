import type { Metadata } from "next";
import Link from "next/link";
import { Compass, Home, Search } from "lucide-react";

/**
 * Page 404 globale, rendue par Next quand aucun segment ne matche l'URL
 * demandée ou quand on appelle `notFound()` depuis un segment qui n'a pas
 * son propre `not-found.tsx`.
 *
 * Mobile-first (375px) : même conteneur que le reste de l'app (`max-w-md`
 * monte en `max-w-2xl` au breakpoint `sm`). Pas d'header custom ici : le
 * root layout reste monté, donc le `<Header>` et la `<BottomNav>` sont
 * déjà présents.
 */
export const metadata: Metadata = {
  title: "Page introuvable",
  description: "La page que tu cherches n'existe pas ou a été supprimée.",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-12 text-center sm:max-w-2xl">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-peyi-orange-50">
        <Compass className="h-8 w-8 text-peyi-orange-500" aria-hidden />
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-peyi-orange-600">
        Erreur 404
      </p>
      <h1 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl">
        Page introuvable
      </h1>
      <p className="mt-3 max-w-sm text-sm text-muted-foreground sm:text-base">
        Pa gen ayen la. La page que tu cherches n&apos;existe pas, a été
        déplacée ou supprimée.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <Link
          href="/"
          className="inline-flex h-10 items-center gap-1.5 rounded-full bg-peyi-orange-500 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-peyi-orange-600"
        >
          <Home className="h-4 w-4" aria-hidden />
          Retour à l&apos;accueil
        </Link>
        <Link
          href="/bons-plans"
          className="inline-flex h-10 items-center gap-1.5 rounded-full border border-border bg-background px-4 text-sm font-semibold text-foreground transition hover:border-peyi-orange-300"
        >
          <Search className="h-4 w-4" aria-hidden />
          Voir les bons plans
        </Link>
      </div>
    </main>
  );
}
