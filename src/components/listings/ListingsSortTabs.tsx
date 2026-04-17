import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  buildListingsUrl,
  type ListingsSort,
  type ListingTypeSlug,
} from "@/lib/listings/url";

type Props = {
  currentSort: ListingsSort;
  category: string | null;
  city: string | null;
  type: ListingTypeSlug | null;
  q?: string | null;
};

const TABS: Array<{ id: ListingsSort; label: string }> = [
  { id: "new", label: "✨ Récents" },
  { id: "price-asc", label: "💸 Prix ↑" },
  { id: "price-desc", label: "💰 Prix ↓" },
];

export function ListingsSortTabs({
  currentSort,
  category,
  city,
  type,
  q,
}: Props) {
  return (
    <nav
      aria-label="Tri des annonces"
      className="-mx-4 flex gap-1 overflow-x-auto px-4 py-1 sm:mx-0 sm:px-0"
    >
      {TABS.map((tab) => {
        const isActive = tab.id === currentSort;
        return (
          <Link
            key={tab.id}
            href={buildListingsUrl({ sort: tab.id, category, city, type, q })}
            scroll={false}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition",
              isActive
                ? "border-peyi-orange-500 bg-peyi-orange-500 text-white"
                : "border-border bg-background text-muted-foreground hover:border-peyi-orange-300 hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
