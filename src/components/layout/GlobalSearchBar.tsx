"use client";

import { Search } from "lucide-react";

import { useMessages } from "@/components/soleil/I18nProvider";

/**
 * Barre de recherche globale montée dans le Header. Submit → navigation
 * vers `/recherche?q=<terme>` qui rend à la fois des deals et des
 * listings correspondants. Le formulaire GET fonctionne aussi avant
 * l'hydratation; la route cible normalise le terme de recherche.
 *
 * Côté UX : input placeholder "Rechercher un bon plan, une annonce…"
 * assez générique pour couvrir les deux entités. On garde le formulaire
 * submit classique (plutôt qu'un `onChange` avec debounce) car la page
 * résultat est déjà paginée/filtrée, pas d'instant-search nécessaire
 * pour l'échelle Péyi.
 */
export function GlobalSearchBar() {
  const t = useMessages();

  return (
    <form
      role="search"
      action="/recherche"
      method="get"
      className="flex min-w-0 flex-1 items-center"
    >
      <label htmlFor="global-search" className="sr-only">
        {t.common.search}
      </label>
      <div className="relative flex w-full max-w-md items-center">
        <input
          id="global-search"
          type="search"
          name="q"
          placeholder={t.common.search}
          className="h-11 min-w-0 w-full rounded-full border-[1.5px] border-soleil-border bg-soleil-input pl-3 pr-12 text-base font-semibold text-soleil-forest placeholder:font-medium placeholder:text-soleil-muted focus-visible:border-soleil-forest focus-visible:outline-none dark:border-soleil-border-d dark:bg-soleil-forest dark:text-soleil-cream dark:placeholder:text-soleil-muted-d dark:focus-visible:border-soleil-cream lg:text-sm"
          autoComplete="off"
          enterKeyHint="search"
        />
        <button
          type="submit"
          aria-label={t.common.search}
          className="absolute right-0 flex h-11 w-11 items-center justify-center rounded-full text-soleil-forest transition-colors hover:bg-soleil-sand dark:text-soleil-cream dark:hover:bg-soleil-night"
        >
          <Search className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </form>
  );
}
