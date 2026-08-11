import Link from "next/link";

import {
  CARBURANT_OPTIONS,
  TYPE_CONTRAT_OPTIONS,
  getFilterSlotsForCategory,
} from "@/lib/listings/field-registry";
import {
  buildListingsUrl,
  EMPTY_FILTERS,
  hasActiveFilters,
  type ListingsFilters,
  type ListingsSort,
  type ListingTypeSlug,
} from "@/lib/listings/url";
import type { Messages } from "@/lib/i18n";
import { tFormat } from "@/lib/i18n/tformat";
import { cn } from "@/lib/utils";

/**
 * Colonne du catalogue « calme » (/annonces) : parcours de catégories
 * (racine → sous-catégories) puis filtres métier de la sélection. Tout
 * est rendu serveur et piloté par l'URL (`buildListingsUrl`) — chaque
 * état est adressable et partageable. Utilisée deux fois : sidebar
 * desktop et tiroir mobile (préfixer les ids via `idPrefix`).
 */

export type CatalogueCategory = {
  id: string;
  slug: string;
  /** Nom affiché (déjà traduit vers la langue de l'interface). */
  name: string;
  parentId: string | null;
};

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

function categoryUrl(
  state: CatalogueState,
  category: string | null,
): string {
  return buildListingsUrl({
    sort: state.sort,
    city: state.city,
    q: state.q,
    type: state.type,
    category,
    filters: genericFilters(state.filters),
  });
}

const EYEBROW_CLASS =
  "font-mono text-[10.5px] font-bold uppercase tracking-[2px] text-soleil-otext dark:text-soleil-otext-d";

const ROW_BASE =
  "-mx-2.5 my-0.5 flex min-h-[38px] items-center justify-between gap-2.5 rounded-[10px] px-2.5 py-1.5 text-sm transition active:scale-[0.99]";

function CategoryRow({
  href,
  name,
  count,
  active,
  hasKids = false,
}: {
  href: string;
  name: string;
  count: number;
  active: boolean;
  hasKids?: boolean;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "page" : undefined}
      className={cn(
        ROW_BASE,
        active
          ? "bg-soleil-forest font-bold text-soleil-cream dark:bg-soleil-cream dark:text-soleil-forest"
          : "text-soleil-body hover:bg-soleil-sand dark:text-soleil-body-d dark:hover:bg-soleil-forest",
      )}
    >
      <span className="min-w-0 truncate">{name}</span>
      <span className="flex flex-none items-center gap-1.5">
        <span
          className={cn(
            "font-mono text-[11.5px]",
            active
              ? "opacity-70"
              : "text-soleil-strike dark:text-soleil-strike-d",
          )}
        >
          {count}
        </span>
        {hasKids && (
          <span
            aria-hidden
            className="text-[13px] text-soleil-strike dark:text-soleil-strike-d"
          >
            ›
          </span>
        )}
      </span>
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/* Colonne catégories                                                         */
/* -------------------------------------------------------------------------- */

export function CatalogueNav({
  categories,
  counts,
  category,
  state,
  t,
}: {
  categories: CatalogueCategory[];
  /** Counts d'annonces publiées par id de catégorie (feuilles). */
  counts: Record<string, number>;
  /** Slug de la catégorie/sous-catégorie active (param `category`). */
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

  // ── Vue « contexte » — UNIFORME pour toutes les catégories ──────────
  // Sélectionner n'importe quelle catégorie (parent, enfant ou feuille)
  // bascule la colonne sur son contexte : retour ‹, en-tête au nom du
  // parent, ligne « Tout {parent} », puis les sous-catégories s'il y en
  // a. Une feuille sans enfants a le même squelette (juste sans liste) —
  // un seul modèle mental, colonne minimale, zéro liste racine parasite.
  if (active) {
    const contextNode = active.parentId
      ? categories.find((c) => c.id === active.parentId) ?? active
      : active;
    const kids = kidsByParent.get(contextNode.id) ?? [];
    const allActive = category === contextNode.slug;

    return (
      <div>
        <Link
          href={categoryUrl(state, null)}
          scroll={false}
          className="mb-3 inline-flex min-h-[32px] items-center gap-1.5 text-[12.5px] font-semibold text-soleil-otext hover:underline dark:text-soleil-otext-d"
        >
          ‹ {t.listings.allCategories}
        </Link>
        <div className="border-b border-soleil-line pb-2.5 dark:border-soleil-line-d">
          <span className={EYEBROW_CLASS}>{contextNode.name}</span>
        </div>
        <div className="flex flex-col py-2">
          <CategoryRow
            href={
              allActive
                ? categoryUrl(state, null)
                : categoryUrl(state, contextNode.slug)
            }
            name={tFormat(t.listings.allIn, { name: contextNode.name })}
            count={totalFor(contextNode)}
            active={allActive}
          />
          {kids.map((k) => (
            <CategoryRow
              key={k.id}
              href={
                category === k.slug
                  ? categoryUrl(state, contextNode.slug)
                  : categoryUrl(state, k.slug)
              }
              name={k.name}
              count={counts[k.id] ?? 0}
              active={category === k.slug}
            />
          ))}
        </div>
      </div>
    );
  }

  // ── Niveau racine ───────────────────────────────────────────────────
  // Chaque ligne est une entrée de parcours (chevron systématique — le
  // clic ouvre toujours le contexte de la catégorie). Les catégories
  // vides restent repliées derrière un lien (règle produit : jamais une
  // catégorie vide comme destination normale).
  const visible = roots.filter((c) => totalFor(c) > 0);
  const hidden = roots.filter((c) => totalFor(c) === 0);

  return (
    <div>
      <div className="border-b border-soleil-line pb-2.5 dark:border-soleil-line-d">
        <span className={EYEBROW_CLASS}>{t.listings.categoriesEyebrow}</span>
      </div>
      <div className="flex flex-col py-2">
        {visible.map((c) => (
          <CategoryRow
            key={c.id}
            href={categoryUrl(state, c.slug)}
            name={c.name}
            count={totalFor(c)}
            active={false}
            hasKids
          />
        ))}
      </div>
      {hidden.length > 0 && (
        <details className="group">
          <summary className="inline-block cursor-pointer list-none pt-1.5 text-[12.5px] font-semibold text-soleil-otext hover:underline dark:text-soleil-otext-d [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">
              {tFormat(t.listings.emptyCatsShow, { n: hidden.length })}
            </span>
            <span className="hidden group-open:inline">
              {t.listings.emptyCatsHide}
            </span>
          </summary>
          <div className="flex flex-col pt-1">
            {hidden.map((c) => (
              <CategoryRow
                key={c.id}
                href={categoryUrl(state, c.slug)}
                name={c.name}
                count={0}
                active={false}
                hasKids
              />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Panneau de filtres                                                         */
/* -------------------------------------------------------------------------- */

const INPUT_CLASS =
  "h-[38px] w-full min-w-0 rounded-[10px] border border-soleil-border bg-soleil-input px-[11px] text-[13.5px] text-soleil-forest placeholder:text-soleil-strike focus:border-soleil-forest focus:outline-none dark:border-soleil-border-d dark:bg-soleil-forest dark:text-soleil-cream dark:placeholder:text-soleil-strike-d dark:focus:border-soleil-cream";

const LABEL_CLASS =
  "mb-[7px] block text-[12.5px] font-bold text-soleil-forest dark:text-soleil-cream";

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
        "inline-flex min-h-[30px] items-center rounded-full px-[11px] text-[12.5px] transition active:scale-95",
        active
          ? "bg-soleil-forest font-bold text-soleil-cream dark:bg-soleil-cream dark:text-soleil-forest"
          : "border border-soleil-border bg-soleil-input font-semibold text-soleil-body hover:border-soleil-forest dark:border-soleil-border-d dark:bg-soleil-forest dark:text-soleil-body-d dark:hover:border-soleil-cream",
      )}
    >
      {label}
    </Link>
  );
}

/** URL courante avec un patch de filtres (chips → toggle immédiat). */
function filterToggleUrl(
  state: CatalogueState,
  category: string | null,
  patch: Partial<ListingsFilters>,
): string {
  return buildListingsUrl({
    sort: state.sort,
    city: state.city,
    q: state.q,
    type: state.type,
    category,
    filters: { ...state.filters, ...patch },
  });
}

export function CatalogueFilters({
  category,
  activeName,
  state,
  t,
  idPrefix,
}: {
  category: string | null;
  /** Nom traduit de la catégorie active (pour « Filtres — {name} »). */
  activeName: string | null;
  state: CatalogueState;
  t: Messages;
  /** Préfixe des ids d'inputs — la colonne est montée 2× (desktop + tiroir). */
  idPrefix: string;
}) {
  const slots = getFilterSlotsForCategory(category);
  const f = state.filters;
  const active =
    hasActiveFilters(f) || state.type !== null;

  const clearUrl = buildListingsUrl({
    sort: state.sort,
    city: state.city,
    q: state.q,
    category,
    filters: EMPTY_FILTERS,
  });

  // Chips carburant : la sélection courte de la maquette (5 valeurs).
  const fuelChips = CARBURANT_OPTIONS.filter((o) =>
    ["essence", "diesel", "hybride", "electrique", "gpl"].includes(o.value),
  );

  const contractChips = TYPE_CONTRAT_OPTIONS.map((o) => ({
    value: o.value,
    label: o.value === "mission_ponctuelle" ? "Ponctuel" : o.label,
  }));

  const typeChips: { value: ListingTypeSlug; label: string }[] = [
    { value: "offer", label: t.listings.typeOffer },
    { value: "demand", label: t.listings.typeDemand },
    { value: "exchange", label: t.listings.typeExchange },
    { value: "donation", label: t.listings.typeDonation },
  ];

  return (
    <div className="mt-[26px]">
      <div className="flex items-baseline justify-between border-b border-soleil-line pb-2.5 dark:border-soleil-line-d">
        <span className={EYEBROW_CLASS}>
          {category && activeName
            ? tFormat(t.listings.filtersOf, { name: activeName })
            : t.listings.filtersEyebrow}
        </span>
        {active && (
          <Link
            href={clearUrl}
            scroll={false}
            className="text-xs font-semibold text-soleil-otext hover:underline dark:text-soleil-otext-d"
          >
            {t.listings.clear}
          </Link>
        )}
      </div>

      <form
        action="/annonces"
        method="get"
        className="mt-3.5 flex flex-col gap-4"
      >
        {/* L'état hors inputs survit au submit GET. */}
        {state.sort !== "new" && (
          <input type="hidden" name="sort" value={state.sort} />
        )}
        {category && <input type="hidden" name="category" value={category} />}
        {state.city && <input type="hidden" name="city" value={state.city} />}
        {state.q && <input type="hidden" name="q" value={state.q} />}
        {state.type && <input type="hidden" name="type" value={state.type} />}
        {f.rooms != null && (
          <input type="hidden" name="pieces" value={String(f.rooms)} />
        )}
        {f.fuel && <input type="hidden" name="carburant" value={f.fuel} />}
        {f.contract && (
          <input type="hidden" name="contrat" value={f.contract} />
        )}

        {slots.includes("priceRange") && (
          <div>
            <span className={LABEL_CLASS}>{t.common.price}</span>
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
          </div>
        )}

        {slots.includes("brand") && (
          <div>
            <label
              htmlFor={`${idPrefix}marque`}
              className={LABEL_CLASS}
            >
              {t.listings.filterBrand}
            </label>
            <input
              id={`${idPrefix}marque`}
              name="marque"
              type="text"
              maxLength={64}
              defaultValue={f.brand ?? ""}
              placeholder="Peugeot, Toyota…"
              className={INPUT_CLASS}
            />
          </div>
        )}

        {slots.includes("yearMin") && (
          <div>
            <label
              htmlFor={`${idPrefix}anneeMin`}
              className={LABEL_CLASS}
            >
              {t.listings.filterYearMin}
            </label>
            <input
              id={`${idPrefix}anneeMin`}
              name="anneeMin"
              type="number"
              inputMode="numeric"
              min={1950}
              defaultValue={f.yearMin ?? ""}
              placeholder="2015"
              className={INPUT_CLASS}
            />
          </div>
        )}

        {slots.includes("kmMax") && (
          <div>
            <label htmlFor={`${idPrefix}kmMax`} className={LABEL_CLASS}>
              {t.listings.filterKmMax}
            </label>
            <input
              id={`${idPrefix}kmMax`}
              name="kmMax"
              type="number"
              inputMode="numeric"
              min={0}
              defaultValue={f.kmMax ?? ""}
              placeholder="150 000"
              className={INPUT_CLASS}
            />
          </div>
        )}

        {slots.includes("surfaceMin") && (
          <div>
            <label
              htmlFor={`${idPrefix}surfaceMin`}
              className={LABEL_CLASS}
            >
              {t.listings.filterSurfaceMin}
            </label>
            <input
              id={`${idPrefix}surfaceMin`}
              name="surfaceMin"
              type="number"
              inputMode="numeric"
              min={0}
              defaultValue={f.surfaceMin ?? ""}
              placeholder="40"
              className={INPUT_CLASS}
            />
          </div>
        )}

        <button
          type="submit"
          className="inline-flex min-h-[38px] items-center justify-center self-start rounded-full bg-soleil-forest px-4 text-[12.5px] font-bold text-soleil-cream transition active:scale-95 dark:bg-soleil-cream dark:text-soleil-forest"
        >
          {t.listings.apply}
        </button>
      </form>

      {/* Chips à application immédiate (navigation, pas de submit). */}
      <div className="mt-4 flex flex-col gap-4">
        {slots.includes("rooms") && (
          <div>
            <span className={LABEL_CLASS}>{t.listings.filterRooms}</span>
            <div className="flex flex-wrap gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <ChipLink
                  key={n}
                  href={filterToggleUrl(state, category, {
                    rooms: f.rooms === n ? null : n,
                  })}
                  label={n === 5 ? "5+" : String(n)}
                  active={f.rooms === n}
                />
              ))}
            </div>
          </div>
        )}

        {slots.includes("fuel") && (
          <div>
            <span className={LABEL_CLASS}>{t.listings.filterFuel}</span>
            <div className="flex flex-wrap gap-1.5">
              {fuelChips.map((o) => (
                <ChipLink
                  key={o.value}
                  href={filterToggleUrl(state, category, {
                    fuel: f.fuel === o.value ? null : o.value,
                  })}
                  label={o.label}
                  active={f.fuel === o.value}
                />
              ))}
            </div>
          </div>
        )}

        {slots.includes("contract") && (
          <div>
            <span className={LABEL_CLASS}>{t.listings.filterContract}</span>
            <div className="flex flex-wrap gap-1.5">
              {contractChips.map((o) => (
                <ChipLink
                  key={o.value}
                  href={filterToggleUrl(state, category, {
                    contract: f.contract === o.value ? null : o.value,
                  })}
                  label={o.label}
                  active={f.contract === o.value}
                />
              ))}
            </div>
          </div>
        )}

        {!category && (
          <div>
            <span className={LABEL_CLASS}>{t.listings.filterType}</span>
            <div className="flex flex-wrap gap-1.5">
              {typeChips.map((o) => (
                <ChipLink
                  key={o.value}
                  href={buildListingsUrl({
                    sort: state.sort,
                    city: state.city,
                    q: state.q,
                    category,
                    type: state.type === o.value ? null : o.value,
                    filters: state.filters,
                  })}
                  label={o.label}
                  active={state.type === o.value}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
