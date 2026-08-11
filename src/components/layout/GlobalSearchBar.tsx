"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";

import { useMessages } from "@/components/soleil/I18nProvider";

/**
 * Barre de recherche globale montée dans le Header. Submit → navigation
 * vers `/recherche?q=<terme>` qui rend à la fois des deals et des
 * listings correspondants. Si l'input est vide, on ne fait rien.
 *
 * Côté UX : input placeholder "Rechercher un bon plan, une annonce…"
 * assez générique pour couvrir les deux entités. On garde le formulaire
 * submit classique (plutôt qu'un `onChange` avec debounce) car la page
 * résultat est déjà paginée/filtrée, pas d'instant-search nécessaire
 * pour l'échelle Péyi.
 */
export function GlobalSearchBar() {
  const t = useMessages();
  const router = useRouter();
  const [value, setValue] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed.length === 0) return;
    const params = new URLSearchParams({ q: trimmed });
    router.push(`/recherche?${params.toString()}`);
  }

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      className="flex min-w-0 flex-1 items-center"
    >
      <label htmlFor="global-search" className="sr-only">
        {t.common.search}
      </label>
      <div className="relative flex w-full max-w-md items-center">
        <Search
          aria-hidden
          className="pointer-events-none absolute left-3 h-4 w-4 text-soleil-muted dark:text-soleil-muted-d"
        />
        <input
          id="global-search"
          type="search"
          name="q"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t.common.search}
          className="h-10 w-full rounded-full border-[1.5px] border-soleil-border bg-soleil-input pl-9 pr-3 text-sm font-semibold text-soleil-forest placeholder:font-medium placeholder:text-soleil-muted focus-visible:border-soleil-forest focus-visible:outline-none dark:border-soleil-border-d dark:bg-soleil-forest dark:text-soleil-cream dark:placeholder:text-soleil-muted-d dark:focus-visible:border-soleil-cream"
          autoComplete="off"
        />
      </div>
    </form>
  );
}
