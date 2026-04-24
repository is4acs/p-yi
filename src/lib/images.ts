/**
 * Vérifie qu'une URL d'image est consommable par `next/image` sans
 * déclencher de crash au render (qui remonterait jusqu'au
 * `error.tsx` global et afficherait "Quelque chose s'est mal
 * passé" à l'utilisateur).
 *
 * `next/image` accepte :
 *   - les chemins locaux commençant par `/` (mais pas `//...` qui
 *     est interprété comme protocol-relative et casse souvent),
 *   - les URLs absolues http/https bien formées.
 *
 * On rejette aussi toute URL contenant des espaces : Next les passe
 * tels quels à l'URL parser qui peut diverger selon la version,
 * et un espace est quasi toujours le signe d'une entrée utilisateur
 * corrompue (copier-coller maladroit dans le formulaire d'upload).
 */
export function isRenderableImageUrl(
  value: string | null | undefined,
): value is string {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;

  if (trimmed.startsWith("/")) {
    return !trimmed.startsWith("//") && !/\s/.test(trimmed);
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const parsed = new URL(trimmed);
      return (
        (parsed.protocol === "http:" || parsed.protocol === "https:") &&
        !/\s/.test(trimmed)
      );
    } catch {
      return false;
    }
  }

  return false;
}
