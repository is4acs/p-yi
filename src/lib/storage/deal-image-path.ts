/**
 * Bucket et parsing d'URL des images de bons plans.
 *
 * Module volontairement PUR (aucun import) : il est utilisé côté app
 * (`deal-images.ts`, qui parle à Supabase) comme côté CLI
 * (`scripts/purge-expired-deals.ts`), où l'on ne veut pas déclencher la
 * validation d'env de `@/lib/env`.
 */

export const DEAL_BUCKET = "deals";

/**
 * Extrait le chemin objet (`<userId>/<fichier>`) depuis l'URL publique
 * Supabase. Renvoie `null` si l'URL ne pointe pas vers le bucket
 * `deals` (image externe ingérée, CDN tiers, URL vide) — dans ce cas il
 * n'y a rien à supprimer de notre côté.
 */
export function dealStoragePath(publicUrl: string): string | null {
  const marker = `/${DEAL_BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.slice(idx + marker.length);
}
