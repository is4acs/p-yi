"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { buildDealsUrl, type DealsSort } from "@/lib/deals/url";

type Props = {
  defaultValue?: string;
  sort?: DealsSort;
  category?: string | null;
  city?: string | null;
  autoFocus?: boolean;
  placeholder?: string;
  className?: string;
};

export function DealsSearchBar({
  defaultValue = "",
  sort,
  category = null,
  city = null,
  autoFocus = false,
  placeholder = "Rechercher un bon plan…",
  className,
}: Props) {
  const [value, setValue] = useState(defaultValue);
  const router = useRouter();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    router.push(
      buildDealsUrl({
        sort,
        category,
        city,
        q: q.length >= 2 ? q : null,
      }),
    );
  }

  function clear() {
    setValue("");
    router.push(buildDealsUrl({ sort, category, city, q: null }));
  }

  return (
    <form
      role="search"
      onSubmit={submit}
      className={cn("relative flex w-full", className)}
    >
      <label htmlFor="deals-search" className="sr-only">
        Rechercher un bon plan
      </label>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      {/* Padding-right responsive : mobile réserve ~44px pour le bouton
          icon-only (h-9 w-9), desktop réserve ~96px pour le bouton
          "Chercher" texte. Sans ça, à 375px viewport, les 96px de
          pr-24 mangeaient ~40% de la zone placeholder et "Rechercher
          un bon plan…" se retrouvait tronqué — bug signalé via
          screenshot iPhone user. */}
      <input
        id="deals-search"
        type="search"
        inputMode="search"
        autoComplete="off"
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-full border border-border bg-background pl-10 pr-12 text-sm shadow-sm transition focus:border-peyi-orange-500 focus:outline-none focus:ring-2 focus:ring-peyi-orange-300 sm:pr-24"
      />
      {value && (
        <button
          type="button"
          onClick={clear}
          aria-label="Effacer la recherche"
          className="absolute right-12 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground sm:right-20"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      )}
      {/* Submit : bouton rond icon-only mobile (w-9 = 36px), pill
          "Chercher" desktop. `aria-label` toujours présent pour les
          screen readers. L'utilisateur peut aussi submit via Enter. */}
      <button
        type="submit"
        aria-label="Lancer la recherche"
        className="absolute right-1 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-peyi-orange-500 text-sm font-semibold text-white transition hover:bg-peyi-orange-600 sm:w-auto sm:px-4"
      >
        <Search className="h-4 w-4 sm:hidden" aria-hidden />
        <span className="hidden sm:inline">Chercher</span>
      </button>
    </form>
  );
}
