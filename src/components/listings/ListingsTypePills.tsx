import Link from "next/link";

import { cn } from "@/lib/utils";
import {
  buildListingsUrl,
  type ListingsFilters,
  type ListingsSort,
  type ListingTypeSlug,
} from "@/lib/listings/url";

type Props = {
  sort: ListingsSort;
  category: string | null;
  city: string | null;
  currentType: ListingTypeSlug | null;
  q?: string | null;
  filters?: ListingsFilters;
};

const PILLS: Array<{ id: ListingTypeSlug | null; label: string }> = [
  { id: null, label: "Tout" },
  { id: "offer", label: "Propose" },
  { id: "demand", label: "Recherche" },
  { id: "exchange", label: "Échange" },
  { id: "donation", label: "Don" },
];

export function ListingsTypePills({
  sort,
  category,
  city,
  currentType,
  q,
  filters,
}: Props) {
  return (
    <nav
      aria-label="Filtrer par type d'annonce"
      className="-mx-4 flex gap-1 overflow-x-auto px-4 py-0.5 sm:mx-0 sm:px-0"
    >
      {PILLS.map((pill) => {
        const isActive = pill.id === currentType;
        return (
          <Link
            key={pill.id ?? "all"}
            href={buildListingsUrl({
              sort,
              category,
              city,
              type: pill.id,
              q,
              filters,
            })}
            scroll={false}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition",
              isActive
                ? "border-peyi-green-500 bg-peyi-green-500 text-white"
                : "border-border bg-background text-muted-foreground hover:border-peyi-green-300 hover:text-peyi-green-700",
            )}
          >
            {pill.label}
          </Link>
        );
      })}
    </nav>
  );
}
