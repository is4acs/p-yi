import { randomBytes } from "node:crypto";

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function shortId(): string {
  return randomBytes(3).toString("hex");
}

export function makeDealSlug(title: string): string {
  const base = slugify(title) || "deal";
  return `${base}-${shortId()}`;
}
