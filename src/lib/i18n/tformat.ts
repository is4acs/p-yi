/**
 * Interpolation des gabarits `{clé}` des dictionnaires. Module pur, sans
 * dépendance serveur : importable côté client (composants "use client")
 * comme côté serveur — `index.ts` le ré-exporte pour ces derniers.
 */
export function tFormat(
  template: string,
  vars: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    key in vars ? String(vars[key]) : match,
  );
}
