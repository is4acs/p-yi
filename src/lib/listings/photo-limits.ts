/**
 * Photo caps per category. Lives in its own file (not alongside the
 * Supabase upload helpers) so both client components and server actions
 * can import it without pulling Supabase into the client bundle.
 */

export const MAX_PHOTOS_DEFAULT = 10;
export const MAX_PHOTOS_EXTENDED = 20;

/**
 * Categories where buyers expect a thorough tour — cars (ext / int / engine
 * / tyres / dash / papers...) and properties (every room + outside +
 * views). Same set leboncoin allows extra photos on.
 */
const HEAVY_PHOTO_CATEGORIES = new Set<string>([
  // Véhicules (slugs from prisma/seed.ts)
  "vehicules",
  "voitures",
  "motos-scooters",
  "quads-buggy",
  "utilitaires-4x4",
  "pirogues-bateaux",
  // Immobilier
  "immobilier",
  "vente-appartement",
  "vente-maison",
  "vente-terrain",
  "location-appartement",
  "location-maison",
  "colocation",
  "location-saisonniere",
  "bureau-local-commercial",
]);

/**
 * Returns the photo cap for a given category slug. Sub-categories of
 * véhicules/immobilier get 20, everything else gets 10. Unknown or null
 * slug falls back to the default — safer than throwing on a form submit.
 */
export function maxPhotosForCategory(categorySlug: string | null): number {
  if (!categorySlug) return MAX_PHOTOS_DEFAULT;
  return HEAVY_PHOTO_CATEGORIES.has(categorySlug)
    ? MAX_PHOTOS_EXTENDED
    : MAX_PHOTOS_DEFAULT;
}
