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
      <input
        id="deals-search"
        type="search"
        inputMode="search"
        autoComplete="off"
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-full border border-border bg-background pl-10 pr-24 text-sm shadow-sm transition focus:border-peyi-orange-500 focus:outline-none focus:ring-2 focus:ring-peyi-orange-300"
      />
      {value && (
        <button
          type="button"
          onClick={clear}
          aria-label="Effacer la recherche"
          className="absolute right-20 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      )}
      <button
        type="submit"
        className="absolute right-1 top-1/2 inline-flex h-9 -translate-y-1/2 items-center rounded-full bg-peyi-orange-500 px-4 text-sm font-semibold text-white transition hover:bg-peyi-orange-600"
      >
        Chercher
      </button>
    </form>
  );
}
