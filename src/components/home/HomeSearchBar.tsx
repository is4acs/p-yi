"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * HomeSearchBar — SearchBar hero de la landing `/`.
 *
 * Différent de `DealsSearchBar` / `ListingsSearchBar` : ici on n'est pas
 * encore sur une page de résultats, on **redirige** vers `/annonces?q=X`
 * au submit (le cœur de l'app est les petites annonces).
 *
 * Pourquoi annonces et pas une route `/recherche` unifiée : au moment où
 * l'utilisateur tape, 85% des intentions sont "je cherche un produit à
 * acheter/vendre", pas "je cherche un deal". `/annonces` affiche déjà un
 * lien "voir aussi dans les bons plans" quand la recherche est non vide
 * (à implémenter en S28 si besoin).
 *
 * Visuellement plus proéminent que les SearchBar internes : hauteur 56px
 * (vs 44px), pill full, focus ring orange plus marqué.
 */
export function HomeSearchBar() {
  const [value, setValue] = useState("");
  const router = useRouter();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    router.push(q.length >= 2 ? `/annonces?q=${encodeURIComponent(q)}` : "/annonces");
  }

  return (
    <form
      role="search"
      onSubmit={submit}
      className="relative flex w-full"
      aria-label="Rechercher une annonce ou un bon plan"
    >
      <label htmlFor="home-search" className="sr-only">
        Que cherches-tu ?
      </label>
      <Search
        className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-peyi-orange-600 sm:left-4"
        aria-hidden
      />
      <input
        id="home-search"
        type="search"
        inputMode="search"
        autoComplete="off"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Rechercher une annonce (voiture, T3, PS5...)"
        className={cn(
          "h-14 w-full rounded-full border-[1.5px] border-ink-100 bg-white pl-11 pr-28 text-sm shadow-sm transition sm:pl-12 sm:pr-32 sm:text-base",
          "focus:border-peyi-orange-500 focus:outline-none focus:ring-4 focus:ring-peyi-orange-100",
          "placeholder:text-ink-300",
        )}
      />
      {value && (
        <button
          type="button"
          onClick={() => setValue("")}
          aria-label="Effacer la recherche"
          className="absolute right-20 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-ink-300 hover:bg-ink-50 hover:text-ink-700 sm:right-28"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      )}
      <button
        type="submit"
        className={cn(
          "absolute right-1.5 top-1/2 inline-flex h-10 -translate-y-1/2 items-center rounded-full bg-peyi-orange-500 px-4 font-display text-xs font-bold text-white shadow-brand transition-[colors,transform] duration-base sm:h-11 sm:px-5 sm:text-sm",
          "hover:bg-peyi-orange-600 sm:hover:-translate-y-[calc(50%+1px)]",
          "active:scale-[0.98]",
        )}
      >
        Chercher
      </button>
    </form>
  );
}
