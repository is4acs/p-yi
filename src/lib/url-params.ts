/**
 * Next livre chaque searchParam en `string | string[] | undefined` : un
 * paramètre répété dans l'URL (`?category=a&category=b`) arrive en TABLEAU,
 * même si le type local de la page prétend `string`. Tout accès direct du
 * genre `searchParams.category.trim()` est donc un crash 500 offert à
 * quiconque forge l'URL — toujours passer par ce helper, qui ne garde que
 * la première occurrence (même convention que `parseFilters`).
 */
export function firstParam(
  value: string | string[] | undefined | null,
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value ?? undefined;
}
