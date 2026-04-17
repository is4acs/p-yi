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

type Params = Partial<{
  sort: ListingsSort;
  category: string | null;
  city: string | null;
  type: ListingTypeSlug | null;
  page: number;
  q: string | null;
}>;

export function buildListingsUrl(params: Params): string {
  const sp = new URLSearchParams();
  if (params.sort && params.sort !== DEFAULT_SORT) sp.set("sort", params.sort);
  if (params.category) sp.set("category", params.category);
  if (params.city) sp.set("city", params.city);
  if (params.type) sp.set("type", params.type);
  if (params.page && params.page > 1) sp.set("page", String(params.page));
  if (params.q) sp.set("q", params.q);
  const qs = sp.toString();
  return qs ? `/annonces?${qs}` : "/annonces";
}
