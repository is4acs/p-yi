import {
  FilterPillGroup,
  type FilterPillOption,
} from "@/components/shared/FilterPillGroup";
import {
  buildListingsUrl,
  type ListingsFilters,
  type ListingsSort,
  type ListingTypeSlug,
} from "@/lib/listings/url";

type Props = {
  currentSort: ListingsSort;
  category: string | null;
  city: string | null;
  type: ListingTypeSlug | null;
  q?: string | null;
  filters?: ListingsFilters;
};

const TABS: Array<{ id: ListingsSort; icon: string; label: string }> = [
  { id: "new", icon: "✨", label: "Récents" },
  { id: "price-asc", icon: "💸", label: "Prix croissant" },
  { id: "price-desc", icon: "💰", label: "Prix décroissant" },
];

/**
 * Tri des annonces. Rendu dans le drawer, donc en pastilles qui passent à
 * la ligne : l'ancien rail `-mx-4 … overflow-x-auto` était calibré pour un
 * conteneur de page, et dans le panneau il collait aux deux bords tout en
 * cachant la dernière option derrière un défilement horizontal invisible.
 * Les libellés sont repassés en clair (« Prix croissant » plutôt que
 * « Prix ↑ ») maintenant qu'il y a la place de les écrire.
 */
export function ListingsSortTabs({
  currentSort,
  category,
  city,
  type,
  q,
  filters,
}: Props) {
  const options: FilterPillOption[] = TABS.map((tab) => ({
    key: tab.id,
    label: tab.label,
    icon: tab.icon,
    href: buildListingsUrl({
      sort: tab.id,
      category,
      city,
      type,
      q,
      filters,
    }),
    isActive: tab.id === currentSort,
  }));

  return <FilterPillGroup id="drawer-listing-sort" title="Trier" options={options} />;
}
