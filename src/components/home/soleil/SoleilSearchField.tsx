"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Champ de recherche souligné — la signature « recherche » de la
 * direction : pas de boîte, juste un filet de 2 px à l'encre du thème et
 * une loupe.
 *
 * Il remplace la barre de recherche globale qui vivait dans l'en-tête.
 * Même destination (`/recherche?q=…`), mais un champ nettement plus
 * large et plus visible, posé dans le héros.
 */
export function SoleilSearchField({ className }: { className?: string }) {
  const router = useRouter();
  const [value, setValue] = useState("");

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        const trimmed = value.trim();
        if (trimmed.length === 0) return;
        router.push(`/recherche?q=${encodeURIComponent(trimmed)}`);
      }}
      className={cn(
        "flex items-center gap-2.5 border-b-2 border-foreground px-0.5 py-3",
        className,
      )}
    >
      <Search className="h-3.5 w-3.5 shrink-0" aria-hidden strokeWidth={2} />
      <label className="sr-only" htmlFor="soleil-search">
        Chercher un bon plan, une annonce ou une activité
      </label>
      <input
        id="soleil-search"
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Chercher… riz, pirogue, billet Paris"
        className="w-full bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
      />
    </form>
  );
}
