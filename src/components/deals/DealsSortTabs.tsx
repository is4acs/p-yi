import Link from "next/link";
import { cn } from "@/lib/utils";
import { buildDealsUrl, type DealsSort } from "@/lib/deals/url";

type Props = {
  currentSort: DealsSort;
  category: string | null;
  city: string | null;
  q?: string | null;
};

const TABS: Array<{ id: DealsSort; label: string }> = [
  { id: "hot", label: "🔥 Tendance" },
  { id: "new", label: "✨ Nouveaux" },
  { id: "top-week", label: "🏆 Top semaine" },
];

export function DealsSortTabs({ currentSort, category, city, q }: Props) {
  return (
    <nav
      aria-label="Tri des bons plans"
      className="-mx-4 flex gap-1 overflow-x-auto px-4 py-1 sm:mx-0 sm:px-0"
    >
      {TABS.map((tab) => {
        const isActive = tab.id === currentSort;
        return (
          <Link
            key={tab.id}
            href={buildDealsUrl({ sort: tab.id, category, city, q })}
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
