"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { SlidersHorizontal, X } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * ListingsFilterDrawer — drawer (sheet) client pour le chrome de filtres.
 *
 * Pourquoi : avant S27, la page `/annonces` empilait TypePills + SortTabs
 * + FilterBar + AttributeFilters + ActiveChips dans son header sticky,
 * consommant ~300px de hauteur avant la 1re annonce (75% du viewport
 * 375px). Ce drawer regroupe tout ça derrière un bouton "Filtrer" —
 * pattern standard des marketplaces (Leboncoin, OLX, Vinted).
 *
 * Comportement :
 *  - **Mobile** : sheet pleine largeur (slide depuis la droite).
 *  - **Desktop** : sidebar droite 420px (comportement standard shadcn).
 *  - Les composants de filtre (server-rendered, Link-driven) sont passés
 *    en enfants. Un clic sur un filtre déclenche une navigation RSC ;
 *    le drawer RESTE OUVERT grâce à la persistance d'état des composants
 *    client à travers les re-renders RSC — l'utilisateur enchaîne
 *    plusieurs filtres sans ré-ouvrir.
 *  - Footer : "Réinitialiser" (lien vers `/annonces` nu) + "Voir les
 *    résultats" (DialogClose). Le bouton principal ferme simplement le
 *    drawer — les filtres ont déjà été appliqués via les liens cliqués.
 *
 * A11y : focus trap natif Radix, ESC ferme, overlay cliquable, titre
 * lié au drawer via `aria-labelledby` implicite (`DialogTitle`).
 */

type Props = {
  /** Nombre total de filtres actifs (category + city + type + attrs). Affiché
   *  comme badge sur le bouton déclencheur. 0 = pas de badge. */
  activeCount: number;
  /** Nombre total de résultats correspondants, affiché sur le bouton
   *  "Voir les X résultats" dans le footer. */
  totalResults: number;
  /** Slot : les composants de filtre rendus côté serveur (TypePills,
   *  SortTabs, FilterBar, AttributeFilters). Chaque filtre est un `<Link>`
   *  qui déclenche une navigation. */
  children: React.ReactNode;
};

export function ListingsFilterDrawer({ activeCount, totalResults, children }: Props) {
  const [open, setOpen] = React.useState(false);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <button
          type="button"
          className={cn(
            "relative inline-flex h-10 items-center gap-2 rounded-full border border-border bg-background px-4 text-sm font-semibold text-foreground transition",
            "hover:border-peyi-orange-300 hover:text-peyi-orange-700",
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
          <header className="flex items-center justify-between border-b border-border px-4 py-3">
            <DialogPrimitive.Title className="font-display text-lg font-semibold text-ink-900">
              Filtres
              {activeCount > 0 && (
                <span className="ml-2 font-mono text-sm text-peyi-orange-600">
                  ({activeCount})
                </span>
              )}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-500 transition hover:bg-ink-50 hover:text-ink-900"
              aria-label="Fermer les filtres"
            >
              <X className="h-5 w-5" aria-hidden />
            </DialogPrimitive.Close>
          </header>

          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            {children}
          </div>

          <footer className="border-t border-border bg-background px-4 py-3">
            <div className="flex items-center gap-3">
              {activeCount > 0 && (
                <Link
                  href="/annonces"
                  className="inline-flex h-11 flex-1 items-center justify-center rounded-full border border-border bg-background text-sm font-semibold text-foreground transition hover:border-peyi-orange-300 hover:text-peyi-orange-700"
                  onClick={() => setOpen(false)}
                >
                  Réinitialiser
                </Link>
              )}
              <DialogPrimitive.Close
                className="inline-flex h-11 flex-1 items-center justify-center rounded-full bg-peyi-orange-500 text-sm font-bold text-white shadow-brand transition hover:bg-peyi-orange-600"
              >
                Voir {totalResults} résultat{totalResults > 1 ? "s" : ""}
              </DialogPrimitive.Close>
            </div>
          </footer>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
