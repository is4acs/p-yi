import {
  FilterPillGroup,
  type FilterPillOption,
} from "@/components/shared/FilterPillGroup";
import { buildDealsUrl, type DealsSort } from "@/lib/deals/url";

type Props = {
  currentSort: DealsSort;
  category: string | null;
  city: string | null;
  q?: string | null;
};

const TABS: Array<{ id: DealsSort; icon: string; label: string }> = [
  { id: "hot", icon: "🔥", label: "Tendance" },
  { id: "new", icon: "✨", label: "Nouveaux" },
  { id: "top-week", icon: "🏆", label: "Top semaine" },
];

/** Tri des bons plans — même grammaire que le tri des annonces. */
export function DealsSortTabs({ currentSort, category, city, q }: Props) {
  const options: FilterPillOption[] = TABS.map((tab) => ({
    key: tab.id,
    label: tab.label,
    icon: tab.icon,
    href: buildDealsUrl({ sort: tab.id, category, city, q }),
    isActive: tab.id === currentSort,
  }));

  return <FilterPillGroup id="drawer-deal-sort" title="Trier" options={options} />;
}
