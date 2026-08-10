/**
 * Ré-hydratation des dates sorties du Data Cache de Next.
 *
 * POURQUOI CE FICHIER EXISTE
 * --------------------------
 * `unstable_cache` ne mémorise pas l'objet JavaScript : il **sérialise** la
 * valeur retournée pour la ranger dans le Data Cache. Au tout premier appel
 * (cache MISS) la fonction rend l'objet Prisma tel quel — les `Date` sont de
 * vraies `Date`. À chaque appel suivant (cache HIT) la valeur est relue depuis
 * le cache et les `Date` reviennent en **chaînes ISO**.
 *
 * Conséquence observée sur /annonces/[slug] et /bons-plans/[slug] : la fiche
 * s'affichait correctement à la première visite, puis plantait à toutes les
 * suivantes —
 *
 *     new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(publishedAt)
 *     → RangeError: Invalid time value
 *
 * suivi, si on passait cette ligne, de `publishedAt.toISOString is not a
 * function`. En production, où le cache est chaud en permanence, cela revenait
 * à casser 100 % des fiches d'annonces et de bons plans.
 *
 * COMMENT S'EN SERVIR
 * -------------------
 * Après CHAQUE lecture passant par `unstable_cache`, repasser la ligne dans
 * `reviveDates` en listant explicitement les champs date du `select` :
 *
 *     const listing = reviveDates(await cached(), ["publishedAt", "expiresAt"]);
 *
 * La liste est volontairement explicite plutôt que devinée : ajouter un champ
 * date à un `select` sans l'ajouter ici doit rester un oubli visible, pas un
 * comportement magique qui parcourt récursivement tout l'objet à chaque rendu.
 */

/**
 * Reconvertit en `Date` les champs listés qui sont revenus en chaîne.
 *
 * - `null` / `undefined` sont laissés tels quels (colonnes nullables) ;
 * - une vraie `Date` (cache MISS) traverse la fonction sans modification ;
 * - une chaîne non parsable est laissée telle quelle plutôt que remplacée par
 *   un `Invalid Date` silencieux.
 */
export function reviveDates<T extends object>(
  row: T,
  keys: readonly (keyof T)[],
): T;
export function reviveDates<T extends object>(
  row: T | null,
  keys: readonly (keyof T)[],
): T | null;
export function reviveDates<T extends object>(
  row: T | null,
  keys: readonly (keyof T)[],
): T | null {
  if (row === null) return null;

  let copy: T | null = null;
  for (const key of keys) {
    const value = row[key];
    if (typeof value !== "string") continue;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) continue;
    copy ??= { ...row };
    copy[key] = date as T[keyof T];
  }
  return copy ?? row;
}
