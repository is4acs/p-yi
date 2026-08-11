"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import Link from "next/link";
import { X } from "lucide-react";

import { useMessages } from "@/components/soleil/I18nProvider";
import { cn } from "@/lib/utils";

/**
 * Tiroir de filtres mobile du catalogue « calme » : feuille plein écran
 * avec le parcours de catégories + filtres (server-rendered, passés en
 * children — chaque clic est une navigation RSC, le tiroir reste ouvert
 * grâce à la persistance d'état client). Barre d'action collée en bas :
 * « Effacer » + « Voir les résultats » (ferme).
 */
export function CatalogueDrawer({
  activeName,
  children,
}: {
  /** Nom (traduit) de la catégorie active — titre du tiroir. */
  activeName: string;
  children: React.ReactNode;
}) {
  const t = useMessages();
  const [open, setOpen] = React.useState(false);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <button
          type="button"
          className="inline-flex h-[46px] flex-none items-center rounded-xl bg-soleil-forest px-[18px] text-sm font-bold text-soleil-cream transition active:scale-95 dark:bg-soleil-cream dark:text-soleil-forest"
        >
          {t.common.filter}
        </button>
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            "fixed inset-0 z-50 flex flex-col bg-soleil-cream text-soleil-forest dark:bg-soleil-night dark:text-soleil-cream",
            "data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom",
            "data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom",
            "duration-200",
          )}
        >
          <header className="flex flex-none items-center justify-between border-b border-soleil-line px-[18px] pb-3.5 pt-[18px] dark:border-soleil-line-d">
            <DialogPrimitive.Title className="font-display text-xl font-extrabold tracking-[-0.3px]">
              {activeName}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label={t.listingDetail.cancel}
              className="flex h-11 w-11 items-center justify-center rounded-full border-[1.5px] border-soleil-border bg-soleil-input transition active:scale-95 dark:border-soleil-border-d dark:bg-soleil-forest"
            >
              <X className="h-4 w-4" aria-hidden />
            </DialogPrimitive.Close>
          </header>

          <div className="flex-1 overflow-y-auto overscroll-contain px-[18px] pb-6 pt-4">
            {children}
          </div>

          <footer className="flex flex-none gap-2.5 border-t border-soleil-line bg-soleil-input px-[18px] py-3.5 pb-[calc(0.875rem+env(safe-area-inset-bottom))] dark:border-soleil-line-d dark:bg-soleil-forest">
            <Link
              href="/annonces"
              scroll={false}
              className="inline-flex h-12 items-center justify-center rounded-full border-[1.5px] border-soleil-border px-5 text-sm font-bold text-soleil-forest transition active:scale-95 dark:border-soleil-border-d dark:text-soleil-cream"
            >
              {t.listings.clear}
            </Link>
            <DialogPrimitive.Close className="inline-flex h-12 flex-1 items-center justify-center rounded-full bg-soleil-orange text-[14.5px] font-bold text-soleil-forest transition active:scale-[0.98]">
              {t.listings.seeResults}
            </DialogPrimitive.Close>
          </footer>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
