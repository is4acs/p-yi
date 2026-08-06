/**
 * Réhydratation des dates sorties d'`unstable_cache`.
 *
 * **Le piège :** `unstable_cache` sérialise sa valeur pour la stocker.
 * Au premier appel (cache MISS) la fonction renvoie ses objets tels
 * quels — un `Date` reste un `Date`. Mais à tous les appels suivants
 * (cache HIT), la valeur est relue depuis le store et chaque `Date` est
 * revenue sous forme de **chaîne ISO**.
 *
 * Le type TypeScript, lui, continue d'annoncer `Date` : Prisma type le
 * `select`, et `unstable_cache` propage ce type sans le modifier. Le
 * compilateur ne voit donc rien, et tout appel de méthode explose au
 * runtime, uniquement en cache HIT :
 *
 *   new Intl.DateTimeFormat("fr-FR").format(deal.publishedAt)
 *     → RangeError: Invalid time value
 *   deal.updatedAt.getTime()
 *     → TypeError: getTime is not a function
 *
 * En production, ça se traduit par des fiches qui s'affichent pour le
 * premier visiteur puis basculent sur la page d'erreur pour tous les
 * suivants, jusqu'à la revalidation. Le symptôme est intermittent et
 * quasi impossible à reproduire en local sur une seule requête — c'est
 * la panne « digest Next côté client » observée sur `/bons-plans` et
 * `/annonces`.
 *
 * **La règle :** toute valeur qui sort d'`unstable_cache` doit voir ses
 * dates repassées par `asDate`. Idéalement, ne cacher que des données
 * déjà sérialisables (nombres, chaînes) — voir `src/lib/stats.ts` qui
 * applique cette discipline.
 */

export function asDate(value: Date | string): Date;
export function asDate(value: Date | string | null | undefined): Date | null;
export function asDate(value: Date | string | null | undefined): Date | null {
  if (value == null) return null;
  return value instanceof Date ? value : new Date(value);
}
