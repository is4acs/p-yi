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
        className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-peyi-orange-600"
        aria-hidden
      />
      <input
        id="home-search"
        type="search"
        inputMode="search"
        autoComplete="off"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Que cherches-tu ? (iPhone, voiture, T3…)"
        className={cn(
          "h-14 w-full rounded-full border-[1.5px] border-ink-100 bg-white pl-12 pr-32 text-base shadow-sm transition",
          "focus:border-peyi-orange-500 focus:outline-none focus:ring-4 focus:ring-peyi-orange-100",
          "placeholder:text-ink-300",
        )}
      />
      {value && (
        <button
          type="button"
          onClick={() => setValue("")}
          aria-label="Effacer la recherche"
          className="absolute right-28 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-ink-300 hover:bg-ink-50 hover:text-ink-700"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      )}
      <button
        type="submit"
        className={cn(
          "absolute right-1.5 top-1/2 inline-flex h-11 -translate-y-1/2 items-center rounded-full bg-peyi-orange-500 px-5 font-display text-sm font-bold text-white shadow-brand transition-[colors,transform] duration-base",
          "hover:bg-peyi-orange-600 hover:-translate-y-[calc(50%+1px)]",
          "active:scale-[0.98]",
        )}
      >
        Chercher
      </button>
    </form>
  );
}
