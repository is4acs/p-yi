"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { SlidersHorizontal, X } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * FilterDrawer — le SEUL point d'entrée des filtres, partagé par
 * `/annonces` et `/bons-plans`.
 *
 * Pourquoi partagé : les deux pages empilaient chacune leur propre
 * chrome de filtres (rail catégories + onglets de tri + deux `<select>`
 * + bouton submit), soit 3 à 4 rangées de contrôles avant le premier
 * résultat. Deux pages jumelles, deux grammaires différentes : on ne
 * savait plus où chercher un filtre. Tout passe maintenant derrière ce
 * bouton unique, avec le même vocabulaire des deux côtés.
 *
 * Comportement :
 *  - **Mobile** : feuille pleine largeur (glisse depuis la droite).
 *  - **Desktop** : panneau latéral de 448 px.
 *  - Les contrôles sont passés en enfants et rendus côté serveur : ce
 *    sont des `<Link>`. Un clic déclenche une navigation RSC et le
 *    drawer RESTE OUVERT (l'état d'un composant client survit aux
 *    re-renders RSC) — on enchaîne les filtres sans le rouvrir.
 *  - Aucun bouton « appliquer » : chaque clic applique déjà. Le footer
 *    ne sert qu'à sortir (« Voir N résultats ») ou à tout remettre à
 *    zéro.
 *
 * A11y : focus trap Radix, ESC ferme, overlay cliquable, titre lié au
 * dialogue via `DialogTitle`.
 */

type Props = {
  /** Filtres actifs — badge sur le déclencheur. 0 = pas de badge. */
  activeCount: number;
  /** Résultats correspondants, affichés sur le bouton de sortie. */
  totalResults: number;
  /** Page nue vers laquelle pointe « Réinitialiser » (`/annonces`…). */
  resetHref: string;
  /** Nom du résultat, singulier ET pluriel. Les deux sont demandés parce
   *  qu'en français le pluriel ne se réduit pas à un « s » final :
   *  « bon plan » → « bons plans ». */
  resultNoun?: { one: string; many: string };
  /** Contrôles de filtre (server components à base de `<Link>`). */
  children: React.ReactNode;
};

const DEFAULT_NOUN = { one: "résultat", many: "résultats" };

export function FilterDrawer({
  activeCount,
  totalResults,
  resetHref,
  resultNoun = DEFAULT_NOUN,
  children,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const noun = totalResults > 1 ? resultNoun.many : resultNoun.one;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <button
          type="button"
          className={cn(
            "relative inline-flex h-11 shrink-0 items-center gap-2 rounded-full border border-border bg-background px-4 text-sm font-semibold text-foreground transition",
            "hover:border-peyi-orange-300 hover:text-peyi-orange-700",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peyi-orange-300 focus-visible:ring-offset-2",
            activeCount > 0 &&
              "border-peyi-orange-500 bg-peyi-orange-50 text-peyi-orange-700",
          )}
          aria-label={
            activeCount > 0
              ? `Filtrer (${activeCount} filtre${activeCount > 1 ? "s" : ""} actif${activeCount > 1 ? "s" : ""})`
              : "Filtrer"
          }
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden />
          Filtrer
          {activeCount > 0 && (
            <span
              aria-hidden
              className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-peyi-orange-500 px-1.5 font-mono text-[11px] font-bold tabular-nums text-white"
            >
              {activeCount}
            </span>
          )}
        </button>
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            "fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-md flex-col bg-background shadow-xl",
            "data-[state=open]:animate-in data-[state=open]:slide-in-from-right",
            "data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right",
            "duration-200",
          )}
        >
          <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-5 py-3">
            <DialogPrimitive.Title className="font-display text-lg font-semibold text-ink-900">
              Filtres
              {activeCount > 0 && (
                <span className="ml-2 font-mono text-sm text-peyi-orange-600">
                  ({activeCount})
                </span>
              )}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              className="-mr-2 inline-flex h-11 w-11 items-center justify-center rounded-full text-ink-500 transition hover:bg-ink-50 hover:text-ink-900"
              aria-label="Fermer les filtres"
            >
              <X className="h-5 w-5" aria-hidden />
            </DialogPrimitive.Close>
          </header>

          {/* `space-y-6` (et non 4) : chaque groupe de filtres a son
              propre titre, il leur faut assez d'air pour se lire comme
              des blocs distincts et non comme une liste continue. */}
          <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
            {children}
          </div>

          {/* `pb-[env(safe-area-inset-bottom)]` : sans ça le bouton passe
              sous l'indicateur d'accueil des iPhone récents. */}
          <footer className="shrink-0 border-t border-border bg-background px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
            <div className="flex items-center gap-3">
              {activeCount > 0 && (
                <Link
                  href={resetHref}
                  className="inline-flex h-11 flex-1 items-center justify-center rounded-full border border-border bg-background text-sm font-semibold text-foreground transition hover:border-peyi-orange-300 hover:text-peyi-orange-700"
                  onClick={() => setOpen(false)}
                >
                  Réinitialiser
                </Link>
              )}
              <DialogPrimitive.Close className="inline-flex h-11 flex-1 items-center justify-center rounded-full bg-peyi-orange-500 px-4 text-sm font-bold text-white shadow-brand transition hover:bg-peyi-orange-600">
                Voir {totalResults} {noun}
              </DialogPrimitive.Close>
            </div>
          </footer>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
