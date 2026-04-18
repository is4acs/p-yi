/**
 * Helpers pour construire les URLs canoniques des pages de listing
 * (bons plans + annonces). Le but est d'éviter les pages dupliquées
 * dans l'index Google quand plusieurs querystrings pointent vers le
 * même contenu (ex. `?sort=hot` vs `?sort=new` vs `?page=2`).
 *
 * Règle de canonicité :
 *   - Les filtres "permanents" (`category`, `city`) font partie de
 *     la canonical URL — chaque facette est une page unique.
 *   - Les filtres "vue" (`sort`, `page`, `q`, prix, attributs) en
 *     sont exclus — ils n'ont pas de valeur SEO propre, on
 *     canonicalise vers la version de base.
 *
 * Next résout les chemins relatifs contre `metadataBase` (défini
 * dans `app/layout.tsx`), donc on retourne des chemins relatifs
 * (ex. `/bons-plans?category=tech`) — plus simple à tester, et
 * Next se charge de la partie domaine.
 */

type CanonicalFacets = {
  category?: string | null;
  city?: string | null;
};

/**
 * Construit un chemin canonique pour une page listing.
 *
 * @param basePath - Chemin de base (ex. `/bons-plans`, `/annonces`)
 * @param facets - Filtres permanents à garder dans la canonical
 * @returns Chemin relatif, ex. `/bons-plans?category=tech&city=cayenne`
 */
export function buildCanonicalPath(
  basePath: string,
  facets: CanonicalFacets = {},
): string {
  const params = new URLSearchParams();
  // Ordre stable pour que la même paire (category, city) produise
  // toujours la même URL, quelle que soit l'ordre d'arrivée des
  // params côté utilisateur. Google traite `?a=1&b=2` et `?b=2&a=1`
  // comme potentiellement différents.
  if (facets.category) params.set("category", facets.category);
  if (facets.city) params.set("city", facets.city);

  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
