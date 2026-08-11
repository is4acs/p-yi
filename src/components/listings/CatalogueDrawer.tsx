"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import Link from "next/link";
import { SlidersHorizontal, X } from "lucide-react";

import { useMessages } from "@/components/soleil/I18nProvider";
import { tFormat } from "@/lib/i18n/tformat";
import { cn } from "@/lib/utils";

/**
 * Modale « Tous les filtres » (modèle Leboncoin) : plein écran sur
 * mobile, panneau centré sur desktop. Les sections (tri, catégories,
 * commune, prix, critères…) sont rendues serveur et passées en children
 * — chaque clic est une navigation RSC, la modale reste ouverte. Barre
 * d'action collée en bas : « Tout effacer » + « Afficher les N
 * annonces » (ferme).
 */
export function CatalogueDrawer({
  total,
  activeCount = 0,
  children,
}: {
  /** Nombre de résultats courants — bouton « Afficher les N annonces ». */
  total: number;
  /** Nombre de filtres actifs — badge sur le déclencheur. */
  activeCount?: number;
  children: React.ReactNode;
}) {
  const t = useMessages();
  const [open, setOpen] = React.useState(false);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-[46px] flex-none items-center gap-2 whitespace-nowrap rounded-xl px-4 text-sm font-bold transition active:scale-95 lg:h-[38px] lg:rounded-full lg:border-[1.5px] lg:text-[13px]",
            "bg-soleil-forest text-soleil-cream dark:bg-soleil-cream dark:text-soleil-forest",
            "lg:border-soleil-border lg:bg-soleil-input lg:text-soleil-forest lg:hover:border-soleil-forest dark:lg:border-soleil-border-d dark:lg:bg-soleil-forest dark:lg:text-soleil-cream dark:lg:hover:border-soleil-cream",
          )}
        >
          <SlidersHorizontal className="h-4 w-4 lg:h-3.5 lg:w-3.5" aria-hidden />
          <span className="lg:hidden">{t.common.filter}</span>
          <span className="hidden lg:inline">{t.listings.allFilters}</span>
          {activeCount > 0 && (
            <span
              aria-hidden
              className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-soleil-orange px-1 text-[10.5px] font-extrabold text-soleil-forest"
            >
              {activeCount}
            </span>
          )}
        </button>
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 hidden bg-black/40 backdrop-blur-sm data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 lg:block" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            "fixed z-50 flex flex-col bg-soleil-cream text-soleil-forest dark:bg-soleil-night dark:text-soleil-cream",
            // Mobile : feuille plein écran. Desktop : panneau centré.
            "inset-0",
            "lg:inset-auto lg:left-1/2 lg:top-1/2 lg:max-h-[85vh] lg:w-[520px] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:overflow-hidden lg:rounded-[20px] lg:border lg:border-soleil-border dark:lg:border-soleil-border-d lg:shadow-2xl",
            "data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom lg:data-[state=open]:slide-in-from-bottom-4 lg:data-[state=open]:fade-in-0",
            "data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom lg:data-[state=closed]:slide-out-to-bottom-4 lg:data-[state=closed]:fade-out-0",
            "duration-200",
          )}
        >
          <header className="flex flex-none items-center justify-between border-b border-soleil-line px-[18px] pb-3.5 pt-[18px] dark:border-soleil-line-d lg:px-6 lg:pt-5">
            <DialogPrimitive.Title className="font-display text-xl font-extrabold tracking-[-0.3px]">
              {t.listings.allFilters}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label={t.listingDetail.cancel}
              className="flex h-11 w-11 items-center justify-center rounded-full border-[1.5px] border-soleil-border bg-soleil-input transition active:scale-95 dark:border-soleil-border-d dark:bg-soleil-forest"
            >
              <X className="h-4 w-4" aria-hidden />
            </DialogPrimitive.Close>
          </header>

          <div className="flex-1 overflow-y-auto overscroll-contain px-[18px] pb-6 lg:px-6">
            {children}
          </div>

          <footer className="flex flex-none gap-2.5 border-t border-soleil-line bg-soleil-input px-[18px] py-3.5 pb-[calc(0.875rem+env(safe-area-inset-bottom))] dark:border-soleil-line-d dark:bg-soleil-forest lg:px-6 lg:pb-3.5">
            <Link
              href="/annonces"
              scroll={false}
              className="inline-flex h-12 items-center justify-center rounded-full border-[1.5px] border-soleil-border px-5 text-sm font-bold text-soleil-forest transition active:scale-95 dark:border-soleil-border-d dark:text-soleil-cream"
            >
              {t.listings.clearAll}
            </Link>
            <DialogPrimitive.Close className="inline-flex h-12 flex-1 items-center justify-center rounded-full bg-soleil-orange text-[14.5px] font-bold text-soleil-forest transition active:scale-[0.98]">
              {tFormat(t.listings.showResults, { n: total })}
            </DialogPrimitive.Close>
          </footer>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
