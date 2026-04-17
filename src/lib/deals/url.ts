export type DealsSort = "hot" | "new" | "top-week";

export const DEFAULT_SORT: DealsSort = "hot";

export function parseSort(input: string | undefined | null): DealsSort {
  if (input === "new" || input === "top-week") return input;
  return "hot";
}

export function parsePage(input: string | undefined | null): number {
  const n = Number(input);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

type Params = Partial<{
  sort: DealsSort;
  category: string | null;
  city: string | null;
  page: number;
  q: string | null;
}>;

export function parseQuery(input: string | undefined | null): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim().slice(0, 100);
  return trimmed.length >= 2 ? trimmed : null;
}

export function buildDealsUrl(params: Params): string {
  const sp = new URLSearchParams();
  if (params.sort && params.sort !== DEFAULT_SORT) sp.set("sort", params.sort);
  if (params.category) sp.set("category", params.category);
  if (params.city) sp.set("city", params.city);
  if (params.page && params.page > 1) sp.set("page", String(params.page));
  if (params.q) sp.set("q", params.q);
  const qs = sp.toString();
  return qs ? `/bons-plans?${qs}` : "/bons-plans";
}
