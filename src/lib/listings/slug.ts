import { slugify, shortId } from "@/lib/deals/slug";

export function makeListingSlug(title: string): string {
  const base = slugify(title) || "annonce";
  return `${base}-${shortId()}`;
}
