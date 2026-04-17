import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";

import {
  CARBURANT_OPTIONS,
  TYPE_CONTRAT_OPTIONS,
  getFilterSlotsForCategory,
  type AttributeFilterSlot,
} from "@/lib/listings/field-registry";
import {
  buildListingsUrl,
  EMPTY_FILTERS,
  hasActiveFilters,
  type ListingsFilters,
  type ListingsSort,
  type ListingTypeSlug,
} from "@/lib/listings/url";

type Props = {
  sort: ListingsSort;
  category: string | null;
  city: string | null;
  type: ListingTypeSlug | null;
  q: string | null;
  filters: ListingsFilters;
};

/**
 * Bloc de filtres facettés. Ne s'affiche que si la catégorie courante
 * expose au moins un critère pertinent (au-delà du simple prix). Sur
 * mobile, on garde le panel replié par défaut via `<details>` pour ne
 * pas saturer le haut de page.
 *
 * Le submit passe par une `action="/annonces"` method GET : chaque input
 * nommé (`prixMin`, `anneeMin`, …) arrive tel quel dans l'URL, et la
 * page le re-parse via `parseFilters`. Les autres params d'état (sort,
 * type, q, catégorie, ville) survivent via des `<input type="hidden">`.
 */
export function ListingsAttributeFilters({
  sort,
  category,
  city,
  type,
  q,
  filters,
}: Props) {
  const slots = getFilterSlotsForCategory(category);

  // Toujours afficher au moins le prix. Si la catégorie ne porte QUE le
  // prix et qu'il n'y a aucun filtre actif, on masque le panel par
  // défaut mais sans le retirer — il reste disponible via l'expansion.
  const hasAdvancedSlots = slots.some((s) => s !== "priceRange");
  const active = hasActiveFilters(filters);

  // Force l'ouverture du panel si on a au moins un filtre actif : l'user
  // doit voir ce qui est en cours pour pouvoir ajuster ou effacer.
  const openByDefault = active;

  if (!hasAdvancedSlots && !active) {
    // Pas de filtre spécifique pour cette catégorie et rien d'actif :
    // on ne pollue pas l'UI avec un panel vide contenant juste le prix.
    return null;
  }

  const resetUrl = buildListingsUrl({
    sort,
    category,
    city,
    type,
    q,
    filters: EMPTY_FILTERS,
  });

  return (
    <details
      open={openByDefault || undefined}
      className="rounded-lg border border-border bg-card p-3 text-sm shadow-sm"
    >
      <summary className="flex cursor-pointer items-center gap-2 font-semibold text-foreground">
        <SlidersHorizontal className="h-4 w-4 text-muted-foreground" aria-hidden />
        Filtres
        {active && (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-peyi-orange-500 px-1.5 text-[10px] font-bold text-white">
            !
          </span>
        )}
      </summary>

      <form
        action="/annonces"
        method="get"
        className="mt-3 space-y-3"
      >
        {/* On conserve l'état hors-filtres via des inputs cachés pour
            survivre au submit du form GET. */}
        {sort !== "new" && <input type="hidden" name="sort" value={sort} />}
        {category && (
          <input type="hidden" name="category" value={category} />
        )}
        {city && <input type="hidden" name="city" value={city} />}
        {type && <input type="hidden" name="type" value={type} />}
        {q && <input type="hidden" name="q" value={q} />}

        {slots.map((slot) => (
          <FilterSlotFields
            key={slot}
            slot={slot}
            filters={filters}
          />
        ))}

        <div className="flex items-center gap-2 pt-1">
          <button
            type="submit"
            className="h-9 rounded-md bg-peyi-orange-500 px-4 text-sm font-semibold text-white transition hover:bg-peyi-orange-600"
          >
            Appliquer
          </button>
          {active && (
            <Link
              href={resetUrl}
              className="h-9 rounded-md border border-border px-3 text-sm font-medium leading-9 text-muted-foreground hover:text-foreground"
            >
              Tout effacer
            </Link>
          )}
        </div>
      </form>
    </details>
  );
}

function FilterSlotFields({
  slot,
  filters,
}: {
  slot: AttributeFilterSlot;
  filters: ListingsFilters;
}) {
  switch (slot) {
    case "priceRange":
      return (
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            name="prixMin"
            label="Prix min (€)"
            defaultValue={filters.priceMin}
            placeholder="0"
          />
          <NumberField
            name="prixMax"
            label="Prix max (€)"
            defaultValue={filters.priceMax}
            placeholder="∞"
          />
        </div>
      );
    case "yearMin":
      return (
        <NumberField
          name="anneeMin"
          label="Année minimum"
          defaultValue={filters.yearMin}
          placeholder="2015"
        />
      );
    case "kmMax":
      return (
        <NumberField
          name="kmMax"
          label="Kilométrage max (km)"
          defaultValue={filters.kmMax}
          placeholder="150000"
        />
      );
    case "surfaceMin":
      return (
        <NumberField
          name="surfaceMin"
          label="Surface min (m²)"
          defaultValue={filters.surfaceMin}
          placeholder="40"
        />
      );
    case "rooms":
      return (
        <NumberField
          name="pieces"
          label="Pièces minimum"
          defaultValue={filters.rooms}
          placeholder="3"
          max={20}
        />
      );
    case "brand":
      return (
        <TextField
          name="marque"
          label="Marque"
          defaultValue={filters.brand}
          placeholder="Peugeot, Toyota…"
        />
      );
    case "fuel":
      return (
        <SelectField
          name="carburant"
          label="Carburant"
          defaultValue={filters.fuel}
          options={CARBURANT_OPTIONS}
        />
      );
    case "contract":
      return (
        <SelectField
          name="contrat"
          label="Type de contrat"
          defaultValue={filters.contract}
          options={TYPE_CONTRAT_OPTIONS}
        />
      );
    default:
      return null;
  }
}

function NumberField({
  name,
  label,
  defaultValue,
  placeholder,
  max,
}: {
  name: string;
  label: string;
  defaultValue: number | null;
  placeholder?: string;
  max?: number;
}) {
  const inputId = `filter-${name}`;
  return (
    <label
      htmlFor={inputId}
      className="block space-y-1 text-xs font-medium text-muted-foreground"
    >
      <span>{label}</span>
      <input
        id={inputId}
        name={name}
        type="number"
        inputMode="numeric"
        min={0}
        max={max}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground shadow-sm transition focus:border-peyi-orange-500 focus:outline-none focus:ring-1 focus:ring-peyi-orange-500"
      />
    </label>
  );
}

function TextField({
  name,
  label,
  defaultValue,
  placeholder,
}: {
  name: string;
  label: string;
  defaultValue: string | null;
  placeholder?: string;
}) {
  const inputId = `filter-${name}`;
  return (
    <label
      htmlFor={inputId}
      className="block space-y-1 text-xs font-medium text-muted-foreground"
    >
      <span>{label}</span>
      <input
        id={inputId}
        name={name}
        type="text"
        maxLength={64}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground shadow-sm transition focus:border-peyi-orange-500 focus:outline-none focus:ring-1 focus:ring-peyi-orange-500"
      />
    </label>
  );
}

function SelectField({
  name,
  label,
  defaultValue,
  options,
}: {
  name: string;
  label: string;
  defaultValue: string | null;
  options: { value: string; label: string }[];
}) {
  const inputId = `filter-${name}`;
  return (
    <label
      htmlFor={inputId}
      className="block space-y-1 text-xs font-medium text-muted-foreground"
    >
      <span>{label}</span>
      <select
        id={inputId}
        name={name}
        defaultValue={defaultValue ?? ""}
        className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground shadow-sm transition focus:border-peyi-orange-500 focus:outline-none focus:ring-1 focus:ring-peyi-orange-500"
      >
        <option value="">Tous</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
