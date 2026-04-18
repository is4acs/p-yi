export type ListingsSort = "new" | "price-asc" | "price-desc";

export const DEFAULT_SORT: ListingsSort = "new";

export function parseSort(input: string | undefined | null): ListingsSort {
  if (input === "price-asc" || input === "price-desc") return input;
  return "new";
}

export function parsePage(input: string | undefined | null): number {
  const n = Number(input);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

export function parseQuery(input: string | undefined | null): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim().slice(0, 100);
  return trimmed.length >= 2 ? trimmed : null;
}

export type ListingTypeSlug = "offer" | "demand" | "exchange" | "donation";

export function parseType(
  input: string | undefined | null,
): ListingTypeSlug | null {
  if (
    input === "offer" ||
    input === "demand" ||
    input === "exchange" ||
    input === "donation"
  ) {
    return input;
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/* Filtres facettés                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Ensemble des filtres numériques / textuels portés dans l'URL. Tous les
 * champs sont nullable — un filtre absent signifie "pas de restriction".
 *
 * Les clés d'URL sont en français pour rester lisibles côté utilisateur
 * (`?prixMin=…&carburant=diesel`). La conversion vers Prisma se fait
 * dans `buildWhere` côté queries.
 */
export type ListingsFilters = {
  priceMin: number | null;
  priceMax: number | null;
  yearMin: number | null;
  kmMax: number | null;
  surfaceMin: number | null;
  rooms: number | null;
  fuel: string | null;
  brand: string | null;
  contract: string | null;
};

export const EMPTY_FILTERS: ListingsFilters = {
  priceMin: null,
  priceMax: null,
  yearMin: null,
  kmMax: null,
  surfaceMin: null,
  rooms: null,
  fuel: null,
  brand: null,
  contract: null,
};

/** Parse un entier positif, borné. Tout le reste tombe à `null`. */
function parsePositiveInt(
  input: string | undefined | null,
  max: number,
): number | null {
  if (typeof input !== "string") return null;
  const n = Number(input.replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return null;
  const rounded = Math.floor(n);
  if (rounded > max) return null;
  return rounded;
}

function parseShortText(
  input: string | undefined | null,
  max = 64,
): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim().slice(0, max);
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Options d'un select `fuel` / `contract`. On valide la valeur contre une
 * allow-list pour éviter d'exposer n'importe quelle string dans l'URL
 * comme critère de filtre.
 */
const FUEL_VALUES = new Set([
  "essence",
  "diesel",
  "hybride",
  "hybride_rechargeable",
  "electrique",
  "gpl",
  "autre",
]);

const CONTRACT_VALUES = new Set([
  "cdi",
  "cdd",
  "interim",
  "stage",
  "alternance",
  "freelance",
  "mission_ponctuelle",
]);

function parseAllowList(
  input: string | undefined | null,
  allowed: Set<string>,
): string | null {
  if (typeof input !== "string") return null;
  const v = input.trim();
  return allowed.has(v) ? v : null;
}

/**
 * Extrait tous les filtres depuis un `searchParams`. Tolère les valeurs
 * multiples (ex. `?prixMin=100&prixMin=200`) en prenant la première.
 */
export function parseFilters(
  sp:
    | URLSearchParams
    | Record<string, string | string[] | undefined>
    | undefined
    | null,
): ListingsFilters {
  const get = (key: string): string | undefined => {
    if (!sp) return undefined;
    if (sp instanceof URLSearchParams) return sp.get(key) ?? undefined;
    const v = sp[key];
    if (Array.isArray(v)) return v[0];
    return v;
  };

  return {
    // 1e9 = borne large (> 100M€), utile pour que les bornes ne coupent
    // pas de vrais cas. Le filtre reste efficace grâce aux index natifs.
    priceMin: parsePositiveInt(get("prixMin"), 1_000_000_000),
    priceMax: parsePositiveInt(get("prixMax"), 1_000_000_000),
    yearMin: parsePositiveInt(get("anneeMin"), new Date().getFullYear() + 1),
    kmMax: parsePositiveInt(get("kmMax"), 2_000_000),
    surfaceMin: parsePositiveInt(get("surfaceMin"), 32_767),
    rooms: parsePositiveInt(get("pieces"), 20),
    fuel: parseAllowList(get("carburant"), FUEL_VALUES),
    brand: parseShortText(get("marque")),
    contract: parseAllowList(get("contrat"), CONTRACT_VALUES),
  };
}

/** True si au moins un filtre est actif. Utile pour afficher un bouton "Réinitialiser". */
export function hasActiveFilters(f: ListingsFilters): boolean {
  return (
    f.priceMin !== null ||
    f.priceMax !== null ||
    f.yearMin !== null ||
    f.kmMax !== null ||
    f.surfaceMin !== null ||
    f.rooms !== null ||
    f.fuel !== null ||
    f.brand !== null ||
    f.contract !== null
  );
}

/**
 * Nombre total de filtres actifs (catégorie + ville + type + chaque
 * attribut). Utilisé pour afficher le badge "Filtrer (3)" dans le
 * drawer. Ne compte pas `q` : la recherche textuelle est visible
 * séparément dans la search bar. Ne compte pas `sort` : un tri n'est
 * pas un filtre qui réduit les résultats.
 */
export function countActiveFilters(params: {
  category: string | null;
  city: string | null;
  type: ListingTypeSlug | null;
  filters: ListingsFilters;
}): number {
  const { category, city, type, filters: f } = params;
  let n = 0;
  if (category) n++;
  if (city) n++;
  if (type) n++;
  if (f.priceMin !== null) n++;
  if (f.priceMax !== null) n++;
  if (f.yearMin !== null) n++;
  if (f.kmMax !== null) n++;
  if (f.surfaceMin !== null) n++;
  if (f.rooms !== null) n++;
  if (f.fuel !== null) n++;
  if (f.brand !== null) n++;
  if (f.contract !== null) n++;
  return n;
}

type Params = Partial<{
  sort: ListingsSort;
  category: string | null;
  city: string | null;
  type: ListingTypeSlug | null;
  page: number;
  q: string | null;
  filters: Partial<ListingsFilters> | null;
}>;

export function buildListingsUrl(params: Params): string {
  const sp = new URLSearchParams();
  if (params.sort && params.sort !== DEFAULT_SORT) sp.set("sort", params.sort);
  if (params.category) sp.set("category", params.category);
  if (params.city) sp.set("city", params.city);
  if (params.type) sp.set("type", params.type);
  if (params.page && params.page > 1) sp.set("page", String(params.page));
  if (params.q) sp.set("q", params.q);

  const f = params.filters;
  if (f) {
    if (f.priceMin != null) sp.set("prixMin", String(f.priceMin));
    if (f.priceMax != null) sp.set("prixMax", String(f.priceMax));
    if (f.yearMin != null) sp.set("anneeMin", String(f.yearMin));
    if (f.kmMax != null) sp.set("kmMax", String(f.kmMax));
    if (f.surfaceMin != null) sp.set("surfaceMin", String(f.surfaceMin));
    if (f.rooms != null) sp.set("pieces", String(f.rooms));
    if (f.fuel) sp.set("carburant", f.fuel);
    if (f.brand) sp.set("marque", f.brand);
    if (f.contract) sp.set("contrat", f.contract);
  }

  const qs = sp.toString();
  return qs ? `/annonces?${qs}` : "/annonces";
}
