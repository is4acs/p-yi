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

/** Type d'annonce. Vert, comme partout ailleurs pour cette dimension. */
export function ListingsTypePills({
  sort,
  category,
  city,
  currentType,
  q,
  filters,
}: Props) {
  const options: FilterPillOption[] = PILLS.map((pill) => ({
    key: pill.id ?? "all",
    label: pill.label,
    href: buildListingsUrl({ sort, category, city, type: pill.id, q, filters }),
    isActive: pill.id === currentType,
  }));

  return (
    <FilterPillGroup
      id="drawer-listing-type"
      title="Type d'annonce"
      options={options}
      accent="green"
    />
  );
}
