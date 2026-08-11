import Link from "next/link";
import type { ReactNode } from "react";
import { X } from "lucide-react";

import {
  CARBURANT_OPTIONS,
  TYPE_CONTRAT_OPTIONS,
  getFilterSlotsForCategory,
} from "@/lib/listings/field-registry";
import {
  buildListingsUrl,
  EMPTY_FILTERS,
  type ListingsFilters,
  type ListingsSort,
  type ListingTypeSlug,
} from "@/lib/listings/url";
import type { Messages } from "@/lib/i18n";
import { tFormat } from "@/lib/i18n/tformat";
import { cn } from "@/lib/utils";

/**
 * Panneaux de filtres du modèle « Leboncoin » pour /annonces : accordéon
 * de catégories à deux niveaux, panneaux Commune / Prix / critères de la
 * catégorie, chips de filtres actifs supprimables, et sections de la
 * modale « Tous les filtres ». Tout est rendu serveur et piloté par
 * l'URL (`buildListingsUrl`) — chaque état est adressable.
 */

export type CatalogueCategory = {
  id: string;
  slug: string;
  /** Nom affiché (déjà traduit vers la langue de l'interface). */
  name: string;
  parentId: string | null;
};

export type CatalogueCity = { slug: string; name: string };

export type CatalogueState = {
  sort: ListingsSort;
  city: string | null;
  q: string | null;
  type: ListingTypeSlug | null;
  filters: ListingsFilters;
};

/** Ne conserve que les filtres génériques quand on change de catégorie. */
function genericFilters(f: ListingsFilters): Partial<ListingsFilters> {
  return { priceMin: f.priceMin, priceMax: f.priceMax };
}

function stateUrl(
  state: CatalogueState,
  patch: Partial<{
    category: string | null;
    city: string | null;
    type: ListingTypeSlug | null;
    sort: ListingsSort;
    filters: Partial<ListingsFilters>;
  }>,
  category: string | null,
): string {
  return buildListingsUrl({
    sort: patch.sort ?? state.sort,
    city: patch.city !== undefined ? patch.city : state.city,
    q: state.q,
    type: patch.type !== undefined ? patch.type : state.type,
    category: patch.category !== undefined ? patch.category : category,
    filters: patch.filters ?? state.filters,
  });
}

const PANEL_LINK =
  "flex min-h-[38px] items-center justify-between gap-2.5 rounded-[10px] px-2.5 text-sm transition active:scale-[0.99]";

const PANEL_LINK_IDLE =
  "text-soleil-body hover:bg-soleil-sand dark:text-soleil-body-d dark:hover:bg-soleil-night";

const PANEL_LINK_ACTIVE =
  "bg-soleil-forest font-bold text-soleil-cream dark:bg-soleil-cream dark:text-soleil-forest";

const INPUT_CLASS =
  "h-[38px] w-full min-w-0 rounded-[10px] border border-soleil-border bg-soleil-cream px-[11px] text-[13.5px] text-soleil-forest placeholder:text-soleil-strike focus:border-soleil-forest focus:outline-none dark:border-soleil-border-d dark:bg-soleil-night dark:text-soleil-cream dark:placeholder:text-soleil-strike-d dark:focus:border-soleil-cream";

const LABEL_CLASS =
  "mb-[7px] block text-[12.5px] font-bold text-soleil-forest dark:text-soleil-cream";

/* -------------------------------------------------------------------------- */
/* Catégories — accordéon à deux niveaux (modèle Leboncoin)                   */
/* -------------------------------------------------------------------------- */

export function CategoryAccordion({
  categories,
  counts,
  category,
  state,
  t,
}: {
  categories: CatalogueCategory[];
  counts: Record<string, number>;
  category: string | null;
  state: CatalogueState;
  t: Messages;
}) {
  const roots = categories.filter((c) => !c.parentId);
  const kidsByParent = new Map<string, CatalogueCategory[]>();
  for (const c of categories) {
    if (!c.parentId) continue;
    const list = kidsByParent.get(c.parentId) ?? [];
    list.push(c);
    kidsByParent.set(c.parentId, list);
  }
  const totalFor = (c: CatalogueCategory): number => {
    const own = counts[c.id] ?? 0;
    const kids = kidsByParent.get(c.id) ?? [];
    return kids.reduce((sum, k) => sum + (counts[k.id] ?? 0), own);
  };
  const active = category
    ? categories.find((c) => c.slug === category) ?? null
    : null;
  const activeParentId = active?.parentId ?? active?.id ?? null;

  const pick = (slug: string | null) =>
    stateUrl(state, { category: slug, filters: genericFilters(state.filters) }, category);

  return (
    <div className="flex max-h-[60vh] flex-col gap-0.5 overflow-y-auto overscroll-contain">
      <Link
        href={pick(null)}
        scroll={false}
        className={cn(PANEL_LINK, !category ? PANEL_LINK_ACTIVE : PANEL_LINK_IDLE)}
      >
        {t.listings.allCategories}
      </Link>
      {roots.map((root) => {
        const kids = kidsByParent.get(root.id) ?? [];
        if (kids.length === 0) {
          const isActive = category === root.slug;
          return (
            <Link
              key={root.id}
              href={pick(isActive ? null : root.slug)}
              scroll={false}
              className={cn(PANEL_LINK, isActive ? PANEL_LINK_ACTIVE : PANEL_LINK_IDLE)}
            >
              <span className="min-w-0 truncate">{root.name}</span>
              <span className="font-mono text-[11.5px] opacity-60">
                {totalFor(root)}
              </span>
            </Link>
          );
        }
        // Parent à sous-catégories : accordéon natif, ouvert quand la
        // sélection courante vit dans cette branche.
        const inBranch = activeParentId === root.id;
        return (
          <details key={root.id} open={inBranch || undefined} className="group">
            <summary
              className={cn(
                PANEL_LINK,
                PANEL_LINK_IDLE,
                "cursor-pointer list-none [&::-webkit-details-marker]:hidden",
              )}
            >
              <span className="min-w-0 truncate font-semibold">{root.name}</span>
              <span className="flex flex-none items-center gap-1.5">
                <span className="font-mono text-[11.5px] text-soleil-strike dark:text-soleil-strike-d">
                  {totalFor(root)}
                </span>
                <span
                  aria-hidden
                  className="text-[12px] text-soleil-strike transition group-open:rotate-90 dark:text-soleil-strike-d"
                >
                  ›
                </span>
              </span>
            </summary>
            <div className="ml-3 flex flex-col gap-0.5 border-l border-soleil-line pl-2 dark:border-soleil-line-d">
              <Link
                href={pick(category === root.slug ? null : root.slug)}
                scroll={false}
                className={cn(
                  PANEL_LINK,
                  category === root.slug ? PANEL_LINK_ACTIVE : PANEL_LINK_IDLE,
                )}
              >
                <span className="min-w-0 truncate">
                  {tFormat(t.listings.allIn, { name: root.name })}
                </span>
                <span className="font-mono text-[11.5px] opacity-60">
                  {totalFor(root)}
                </span>
              </Link>
              {kids.map((k) => {
                const isActive = category === k.slug;
                return (
                  <Link
                    key={k.id}
                    href={pick(isActive ? root.slug : k.slug)}
                    scroll={false}
                    className={cn(
                      PANEL_LINK,
                      isActive ? PANEL_LINK_ACTIVE : PANEL_LINK_IDLE,
                    )}
                  >
                    <span className="min-w-0 truncate">{k.name}</span>
                    <span className="font-mono text-[11.5px] opacity-60">
                      {counts[k.id] ?? 0}
                    </span>
                  </Link>
                );
              })}
            </div>
          </details>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Commune                                                                    */
/* -------------------------------------------------------------------------- */

export function CityPanel({
  cities,
  category,
  state,
  t,
}: {
  cities: CatalogueCity[];
  category: string | null;
  state: CatalogueState;
  t: Messages;
}) {
  return (
    <div className="flex max-h-[55vh] flex-col gap-0.5 overflow-y-auto overscroll-contain">
      <Link
        href={stateUrl(state, { city: null }, category)}
        scroll={false}
        className={cn(PANEL_LINK, !state.city ? PANEL_LINK_ACTIVE : PANEL_LINK_IDLE)}
      >
        {t.listings.allCities}
      </Link>
      {cities.map((c) => {
        const isActive = state.city === c.slug;
        return (
          <Link
            key={c.slug}
            href={stateUrl(state, { city: isActive ? null : c.slug }, category)}
            scroll={false}
            className={cn(PANEL_LINK, isActive ? PANEL_LINK_ACTIVE : PANEL_LINK_IDLE)}
          >
            {c.name}
          </Link>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Mini-formulaires GET (prix, année, km, surface, marque)                    */
/* -------------------------------------------------------------------------- */

/** Inputs cachés qui font survivre le reste de l'état au submit GET. */
function HiddenState({
  state,
  category,
  omit,
}: {
  state: CatalogueState;
  category: string | null;
  omit: string[];
}) {
  const f = state.filters;
  const entries: [string, string][] = [];
  if (state.sort !== "new") entries.push(["sort", state.sort]);
  if (category) entries.push(["category", category]);
  if (state.city) entries.push(["city", state.city]);
  if (state.q) entries.push(["q", state.q]);
  if (state.type) entries.push(["type", state.type]);
  if (f.priceMin != null) entries.push(["prixMin", String(f.priceMin)]);
  if (f.priceMax != null) entries.push(["prixMax", String(f.priceMax)]);
  if (f.yearMin != null) entries.push(["anneeMin", String(f.yearMin)]);
  if (f.kmMax != null) entries.push(["kmMax", String(f.kmMax)]);
  if (f.surfaceMin != null) entries.push(["surfaceMin", String(f.surfaceMin)]);
  if (f.rooms != null) entries.push(["pieces", String(f.rooms)]);
  if (f.fuel) entries.push(["carburant", f.fuel]);
  if (f.brand) entries.push(["marque", f.brand]);
  if (f.contract) entries.push(["contrat", f.contract]);
  return (
    <>
      {entries
        .filter(([key]) => !omit.includes(key))
        .map(([key, value]) => (
          <input key={key} type="hidden" name={key} value={value} />
        ))}
    </>
  );
}

function ApplyButton({ t }: { t: Messages }) {
  return (
    <button
      type="submit"
      className="mt-3 inline-flex min-h-[38px] w-full items-center justify-center rounded-full bg-soleil-forest px-4 text-[13px] font-bold text-soleil-cream transition active:scale-95 dark:bg-soleil-cream dark:text-soleil-forest"
    >
      {t.listings.apply}
    </button>
  );
}

export function PricePanel({
  category,
  state,
  t,
  idPrefix,
}: {
  category: string | null;
  state: CatalogueState;
  t: Messages;
  idPrefix: string;
}) {
  const f = state.filters;
  return (
    <form action="/annonces" method="get">
      <HiddenState state={state} category={category} omit={["prixMin", "prixMax"]} />
      <span className={LABEL_CLASS}>{t.common.price} (€)</span>
      <div className="flex items-center gap-2">
        <input
          id={`${idPrefix}prixMin`}
          aria-label={`${t.common.price} min`}
          name="prixMin"
          type="number"
          inputMode="numeric"
          min={0}
          defaultValue={f.priceMin ?? ""}
          placeholder="0"
          className={INPUT_CLASS}
        />
        <span className="text-xs text-soleil-strike dark:text-soleil-strike-d">
          {t.listings.rangeTo}
        </span>
        <input
          id={`${idPrefix}prixMax`}
          aria-label={`${t.common.price} max`}
          name="prixMax"
          type="number"
          inputMode="numeric"
          min={0}
          defaultValue={f.priceMax ?? ""}
          placeholder="∞"
          className={INPUT_CLASS}
        />
      </div>
      <ApplyButton t={t} />
    </form>
  );
}

export function InputPanel({
  category,
  state,
  t,
  idPrefix,
  name,
  label,
  defaultValue,
  placeholder,
  type = "number",
}: {
  category: string | null;
  state: CatalogueState;
  t: Messages;
  idPrefix: string;
  name: "anneeMin" | "kmMax" | "surfaceMin" | "marque";
  label: string;
  defaultValue: string;
  placeholder: string;
  type?: "number" | "text";
}) {
  return (
    <form action="/annonces" method="get">
      <HiddenState state={state} category={category} omit={[name]} />
      <label htmlFor={`${idPrefix}${name}`} className={LABEL_CLASS}>
        {label}
      </label>
      <input
        id={`${idPrefix}${name}`}
        name={name}
        type={type}
        inputMode={type === "number" ? "numeric" : undefined}
        min={type === "number" ? 0 : undefined}
        maxLength={type === "text" ? 64 : undefined}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className={INPUT_CLASS}
      />
      <ApplyButton t={t} />
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/* Chips de facette (application immédiate)                                   */
/* -------------------------------------------------------------------------- */

function ChipLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-pressed={active}
      className={cn(
        "inline-flex min-h-[32px] items-center rounded-full px-3 text-[12.5px] transition active:scale-95",
        active
          ? "bg-soleil-forest font-bold text-soleil-cream dark:bg-soleil-cream dark:text-soleil-forest"
          : "border border-soleil-border bg-soleil-cream font-semibold text-soleil-body hover:border-soleil-forest dark:border-soleil-border-d dark:bg-soleil-night dark:text-soleil-body-d dark:hover:border-soleil-cream",
      )}
    >
      {label}
    </Link>
  );
}

export function RoomsChips({
  category,
  state,
}: {
  category: string | null;
  state: CatalogueState;
}) {
  const f = state.filters;
  return (
    <div className="flex flex-wrap gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <ChipLink
          key={n}
          href={stateUrl(
            state,
            { filters: { ...f, rooms: f.rooms === n ? null : n } },
            category,
          )}
          label={n === 5 ? "5+" : String(n)}
          active={f.rooms === n}
        />
      ))}
    </div>
  );
}

export function FuelChips({
  category,
  state,
}: {
  category: string | null;
  state: CatalogueState;
}) {
  const f = state.filters;
  const options = CARBURANT_OPTIONS.filter((o) =>
    ["essence", "diesel", "hybride", "electrique", "gpl"].includes(o.value),
  );
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <ChipLink
          key={o.value}
          href={stateUrl(
            state,
            { filters: { ...f, fuel: f.fuel === o.value ? null : o.value } },
            category,
          )}
          label={o.label}
          active={f.fuel === o.value}
        />
      ))}
    </div>
  );
}

export function ContractChips({
  category,
  state,
}: {
  category: string | null;
  state: CatalogueState;
}) {
  const f = state.filters;
  return (
    <div className="flex flex-wrap gap-1.5">
      {TYPE_CONTRAT_OPTIONS.map((o) => (
        <ChipLink
          key={o.value}
          href={stateUrl(
            state,
            {
              filters: {
                ...f,
                contract: f.contract === o.value ? null : o.value,
              },
            },
            category,
          )}
          label={o.value === "mission_ponctuelle" ? "Ponctuel" : o.label}
          active={f.contract === o.value}
        />
      ))}
    </div>
  );
}

export function TypeChips({
  category,
  state,
  t,
}: {
  category: string | null;
  state: CatalogueState;
  t: Messages;
}) {
  const options: { value: ListingTypeSlug; label: string }[] = [
    { value: "offer", label: t.listings.typeOffer },
    { value: "demand", label: t.listings.typeDemand },
    { value: "exchange", label: t.listings.typeExchange },
    { value: "donation", label: t.listings.typeDonation },
  ];
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <ChipLink
          key={o.value}
          href={stateUrl(
            state,
            { type: state.type === o.value ? null : o.value },
            category,
          )}
          label={o.label}
          active={state.type === o.value}
        />
      ))}
    </div>
  );
}

export function SortChips({
  category,
  state,
  t,
}: {
  category: string | null;
  state: CatalogueState;
  t: Messages;
}) {
  const options: { value: ListingsSort; label: string }[] = [
    { value: "new", label: t.listings.sortRecent },
    { value: "price-asc", label: t.listings.sortPriceAsc },
    { value: "price-desc", label: t.listings.sortPriceDesc },
  ];
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <ChipLink
          key={o.value}
          href={stateUrl(state, { sort: o.value }, category)}
          label={o.label}
          active={state.sort === o.value}
        />
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Chips de filtres ACTIFS (supprimables) — au-dessus des résultats           */
/* -------------------------------------------------------------------------- */

export function ActiveChips({
  category,
  activeName,
  cityName,
  state,
  t,
}: {
  category: string | null;
  activeName: string | null;
  cityName: string | null;
  state: CatalogueState;
  t: Messages;
}) {
  const f = state.filters;
  const chips: { key: string; label: string; href: string }[] = [];
  const drop = (patch: Parameters<typeof stateUrl>[1]) =>
    stateUrl(state, patch, category);

  if (category && activeName) {
    chips.push({
      key: "category",
      label: activeName,
      href: drop({ category: null }),
    });
  }
  if (state.city) {
    chips.push({
      key: "city",
      label: cityName ?? state.city,
      href: drop({ city: null }),
    });
  }
  if (state.type) {
    const typeLabels: Record<ListingTypeSlug, string> = {
      offer: t.listings.typeOffer,
      demand: t.listings.typeDemand,
      exchange: t.listings.typeExchange,
      donation: t.listings.typeDonation,
    };
    chips.push({
      key: "type",
      label: typeLabels[state.type],
      href: drop({ type: null }),
    });
  }
  if (f.priceMin != null || f.priceMax != null) {
    const label =
      f.priceMin != null && f.priceMax != null
        ? `${f.priceMin} – ${f.priceMax} €`
        : f.priceMin != null
        ? `≥ ${f.priceMin} €`
        : `≤ ${f.priceMax} €`;
    chips.push({
      key: "price",
      label,
      href: drop({ filters: { ...f, priceMin: null, priceMax: null } }),
    });
  }
  if (f.brand) {
    chips.push({
      key: "brand",
      label: f.brand,
      href: drop({ filters: { ...f, brand: null } }),
    });
  }
  if (f.yearMin != null) {
    chips.push({
      key: "year",
      label: `≥ ${f.yearMin}`,
      href: drop({ filters: { ...f, yearMin: null } }),
    });
  }
  if (f.kmMax != null) {
    chips.push({
      key: "km",
      label: `≤ ${f.kmMax.toLocaleString("fr-FR")} km`,
      href: drop({ filters: { ...f, kmMax: null } }),
    });
  }
  if (f.surfaceMin != null) {
    chips.push({
      key: "surface",
      label: `≥ ${f.surfaceMin} m²`,
      href: drop({ filters: { ...f, surfaceMin: null } }),
    });
  }
  if (f.rooms != null) {
    chips.push({
      key: "rooms",
      label: `≥ ${f.rooms === 5 ? "5+" : f.rooms} ${t.listings.filterRooms.toLowerCase()}`,
      href: drop({ filters: { ...f, rooms: null } }),
    });
  }
  if (f.fuel) {
    const label =
      CARBURANT_OPTIONS.find((o) => o.value === f.fuel)?.label ?? f.fuel;
    chips.push({
      key: "fuel",
      label,
      href: drop({ filters: { ...f, fuel: null } }),
    });
  }
  if (f.contract) {
    const label =
      TYPE_CONTRAT_OPTIONS.find((o) => o.value === f.contract)?.label ??
      f.contract;
    chips.push({
      key: "contract",
      label,
      href: drop({ filters: { ...f, contract: null } }),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="scrollbar-hide -mx-5 mt-3 flex items-center gap-2 overflow-x-auto px-5 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0">
      {chips.map((chip) => (
        <Link
          key={chip.key}
          href={chip.href}
          scroll={false}
          aria-label={`${t.listings.remove} : ${chip.label}`}
          className="inline-flex min-h-[32px] flex-none items-center gap-1.5 rounded-full bg-soleil-forest px-3 text-[12.5px] font-bold text-soleil-cream transition active:scale-95 dark:bg-soleil-cream dark:text-soleil-forest"
        >
          {chip.label}
          <X className="h-3 w-3" aria-hidden />
        </Link>
      ))}
      {chips.length > 1 && (
        <Link
          href={buildListingsUrl({ q: state.q, filters: EMPTY_FILTERS })}
          scroll={false}
          className="flex-none whitespace-nowrap text-[12.5px] font-bold text-soleil-otext hover:underline dark:text-soleil-otext-d"
        >
          {t.listings.clearAll}
        </Link>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Sections de la modale « Tous les filtres »                                 */
/* -------------------------------------------------------------------------- */

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-soleil-line pb-4 pt-4 first:pt-0 last:border-0 dark:border-soleil-line-d">
      <h3 className="mb-2.5 text-[13px] font-extrabold uppercase tracking-[0.5px] text-soleil-otext dark:text-soleil-otext-d">
        {title}
      </h3>
      {children}
    </section>
  );
}

export function DrawerSections({
  categories,
  counts,
  cities,
  category,
  state,
  t,
  idPrefix,
}: {
  categories: CatalogueCategory[];
  counts: Record<string, number>;
  cities: CatalogueCity[];
  category: string | null;
  state: CatalogueState;
  t: Messages;
  idPrefix: string;
}) {
  const slots = getFilterSlotsForCategory(category);
  const f = state.filters;
  return (
    <div>
      <Section title={t.listings.sortLabel.replace(/\s*:\s*$/, "")}>
        <SortChips category={category} state={state} t={t} />
      </Section>
      <Section title={t.common.category}>
        <CategoryAccordion
          categories={categories}
          counts={counts}
          category={category}
          state={state}
          t={t}
        />
      </Section>
      <Section title={t.common.city}>
        <CityPanel cities={cities} category={category} state={state} t={t} />
      </Section>
      {slots.includes("priceRange") && (
        <Section title={t.common.price}>
          <PricePanel
            category={category}
            state={state}
            t={t}
            idPrefix={idPrefix}
          />
        </Section>
      )}
      {slots.includes("brand") && (
        <Section title={t.listings.filterBrand}>
          <InputPanel
            category={category}
            state={state}
            t={t}
            idPrefix={idPrefix}
            name="marque"
            label={t.listings.filterBrand}
            defaultValue={f.brand ?? ""}
            placeholder="Peugeot, Toyota…"
            type="text"
          />
        </Section>
      )}
      {slots.includes("yearMin") && (
        <Section title={t.listings.filterYearMin}>
          <InputPanel
            category={category}
            state={state}
            t={t}
            idPrefix={idPrefix}
            name="anneeMin"
            label={t.listings.filterYearMin}
            defaultValue={f.yearMin != null ? String(f.yearMin) : ""}
            placeholder="2015"
          />
        </Section>
      )}
      {slots.includes("kmMax") && (
        <Section title={t.listings.filterKmMax}>
          <InputPanel
            category={category}
            state={state}
            t={t}
            idPrefix={idPrefix}
            name="kmMax"
            label={t.listings.filterKmMax}
            defaultValue={f.kmMax != null ? String(f.kmMax) : ""}
            placeholder="150 000"
          />
        </Section>
      )}
      {slots.includes("surfaceMin") && (
        <Section title={t.listings.filterSurfaceMin}>
          <InputPanel
            category={category}
            state={state}
            t={t}
            idPrefix={idPrefix}
            name="surfaceMin"
            label={t.listings.filterSurfaceMin}
            defaultValue={f.surfaceMin != null ? String(f.surfaceMin) : ""}
            placeholder="40"
          />
        </Section>
      )}
      {slots.includes("rooms") && (
        <Section title={t.listings.filterRooms}>
          <RoomsChips category={category} state={state} />
        </Section>
      )}
      {slots.includes("fuel") && (
        <Section title={t.listings.filterFuel}>
          <FuelChips category={category} state={state} />
        </Section>
      )}
      {slots.includes("contract") && (
        <Section title={t.listings.filterContract}>
          <ContractChips category={category} state={state} />
        </Section>
      )}
      <Section title={t.listings.filterType}>
        <TypeChips category={category} state={state} t={t} />
      </Section>
    </div>
  );
}
