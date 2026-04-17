import Link from "next/link";
import { X } from "lucide-react";

import {
  CARBURANT_OPTIONS,
  TYPE_CONTRAT_OPTIONS,
} from "@/lib/listings/field-registry";
import {
  listingTypeFromSlug,
  TYPE_LABEL,
} from "@/lib/listings/queries";
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
  type: ListingTypeSlug | null;
  q: string | null;
  filters: ListingsFilters;
  /** Nom humain de la catégorie sélectionnée (résolu depuis le slug par
   * la page). Null si aucune catégorie. */
  categoryName: string | null;
  /** Nom humain de la commune sélectionnée. Null si aucune commune. */
  cityName: string | null;
};

type Chip = {
  key: string;
  label: string;
  href: string;
};

/**
 * Affiche une rangée de pills retirables pour chaque filtre actif (socle
 * catégorie/ville/type/recherche + attributs dénormalisés). Un click sur
 * un chip retire uniquement ce filtre, les autres restent dans l'URL.
 *
 * La section n'apparaît pas quand aucun filtre n'est actif. Si plusieurs
 * chips sont visibles, on ajoute un bouton "Tout effacer" en fin de
 * liste pour un reset rapide.
 */
export function ListingsActiveFilterChips({
  sort,
  category,
  city,
  type,
  q,
  filters,
  categoryName,
  cityName,
}: Props) {
  const base = { sort, category, city, type, q, filters };
  const chips: Chip[] = [];

  // --- Socle --------------------------------------------------------------
  if (category) {
    chips.push({
      key: "category",
      label: categoryName ?? category,
      href: buildListingsUrl({ ...base, category: null }),
    });
  }
  if (city) {
    chips.push({
      key: "city",
      label: cityName ?? city,
      href: buildListingsUrl({ ...base, city: null }),
    });
  }
  if (type) {
    chips.push({
      key: "type",
      label: TYPE_LABEL[listingTypeFromSlug(type)],
      href: buildListingsUrl({ ...base, type: null }),
    });
  }
  if (q) {
    chips.push({
      key: "q",
      label: `« ${q} »`,
      href: buildListingsUrl({ ...base, q: null }),
    });
  }

  // --- Filtres d'attributs ------------------------------------------------
  if (filters.priceMin != null || filters.priceMax != null) {
    let label: string;
    if (filters.priceMin != null && filters.priceMax != null) {
      label = `${fmtPrice(filters.priceMin)} – ${fmtPrice(filters.priceMax)}`;
    } else if (filters.priceMin != null) {
      label = `≥ ${fmtPrice(filters.priceMin)}`;
    } else {
      label = `≤ ${fmtPrice(filters.priceMax as number)}`;
    }
    chips.push({
      key: "price",
      label,
      href: buildListingsUrl({
        ...base,
        filters: { ...filters, priceMin: null, priceMax: null },
      }),
    });
  }
  if (filters.yearMin != null) {
    chips.push({
      key: "yearMin",
      label: `≥ ${filters.yearMin}`,
      href: buildListingsUrl({
        ...base,
        filters: { ...filters, yearMin: null },
      }),
    });
  }
  if (filters.kmMax != null) {
    chips.push({
      key: "kmMax",
      label: `≤ ${fmtNum(filters.kmMax)} km`,
      href: buildListingsUrl({
        ...base,
        filters: { ...filters, kmMax: null },
      }),
    });
  }
  if (filters.surfaceMin != null) {
    chips.push({
      key: "surfaceMin",
      label: `≥ ${filters.surfaceMin} m²`,
      href: buildListingsUrl({
        ...base,
        filters: { ...filters, surfaceMin: null },
      }),
    });
  }
  if (filters.rooms != null) {
    // "3 pièces" au singulier pluriel n'a pas de sens grammatical ici
    // (c'est un seuil), mais on garde le mot "pièces" toujours pluriel
    // pour éviter le faux singulier "≥ 1 pièce".
    chips.push({
      key: "rooms",
      label: `≥ ${filters.rooms} pièces`,
      href: buildListingsUrl({
        ...base,
        filters: { ...filters, rooms: null },
      }),
    });
  }
  if (filters.fuel) {
    const opt = CARBURANT_OPTIONS.find((o) => o.value === filters.fuel);
    chips.push({
      key: "fuel",
      label: opt?.label ?? filters.fuel,
      href: buildListingsUrl({
        ...base,
        filters: { ...filters, fuel: null },
      }),
    });
  }
  if (filters.brand) {
    chips.push({
      key: "brand",
      label: filters.brand,
      href: buildListingsUrl({
        ...base,
        filters: { ...filters, brand: null },
      }),
    });
  }
  if (filters.contract) {
    const opt = TYPE_CONTRAT_OPTIONS.find((o) => o.value === filters.contract);
    chips.push({
      key: "contract",
      label: opt?.label ?? filters.contract,
      href: buildListingsUrl({
        ...base,
        filters: { ...filters, contract: null },
      }),
    });
  }

  if (chips.length === 0) return null;

  // "Tout effacer" retombe sur `/annonces` en préservant uniquement le tri
  // (qui est une préférence utilisateur, pas un filtre).
  const resetAllUrl = buildListingsUrl({ sort });

  return (
    <nav
      aria-label="Filtres actifs"
      className="-mx-4 flex items-center gap-1.5 overflow-x-auto px-4 py-0.5 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
    >
      {chips.map((chip) => (
        <Link
          key={chip.key}
          href={chip.href}
          scroll={false}
          aria-label={`Retirer le filtre ${chip.label}`}
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-peyi-orange-300 bg-peyi-orange-50 px-2.5 py-1 text-xs font-medium text-peyi-orange-800 transition hover:border-peyi-orange-400 hover:bg-peyi-orange-100"
        >
          <span className="max-w-[9rem] truncate">{chip.label}</span>
          <X className="h-3 w-3 shrink-0" aria-hidden />
        </Link>
      ))}
      {chips.length > 1 && (
        <Link
          href={resetAllUrl}
          scroll={false}
          className="inline-flex shrink-0 items-center rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition hover:border-peyi-orange-300 hover:text-foreground"
        >
          Tout effacer
        </Link>
      )}
    </nav>
  );
}

function fmtPrice(n: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtNum(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(n);
}
