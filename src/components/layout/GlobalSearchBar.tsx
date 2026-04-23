"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";

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
        Rechercher sur Péyi
      </label>
      <div className="relative flex w-full max-w-md items-center">
        <Search
          aria-hidden
          className="pointer-events-none absolute left-2.5 h-4 w-4 text-muted-foreground"
        />
        <input
          id="global-search"
          type="search"
          name="q"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Rechercher"
          className="h-9 w-full rounded-full border border-border bg-card pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-peyi-orange-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-peyi-orange-400"
          autoComplete="off"
        />
      </div>
    </form>
  );
}
