/**
 * Validation des chemins de redirection fournis par l'utilisateur.
 *
 * Plusieurs endpoints acceptent une destination contrôlée par l'appelant :
 *  - `?next=` sur `/auth/callback` et `/auth/confirm` (après login/confirm)
 *  - `?to=` sur `/r/[code]` (lien d'affiliation)
 *  - `?next=` propagé par `requireUser` vers `/connexion`
 *
 * Sans validation, un attaquant peut transformer ces liens en **open
 * redirect** : il envoie à une victime un lien légitime pointant vers
 * Péyi, mais avec un `next`/`to` qui la renvoie vers un site tiers
 * (phishing crédible car l'URL de départ est bien celle de Péyi).
 *
 * Les pièges classiques, tous couverts ici :
 *  - URL absolue : `https://evil.com`
 *  - protocol-relative : `//evil.com` (le navigateur garde le schéma
 *    courant et part sur evil.com)
 *  - backslash-escape : `/\evil.com` — `new URL()` et les navigateurs
 *    normalisent `\` en `/`, donc ça équivaut à `//evil.com`
 *  - userinfo-trick : `@evil.com` concaténé à l'origine donne
 *    `https://peyi.app@evil.com` dont le host réel est `evil.com`
 *
 * Règle : on n'accepte qu'un chemin relatif à la racine (`/…`) qui, une
 * fois résolu, reste sur une origine sentinelle. Tout le reste retombe
 * sur `fallback`.
 */
export function safeInternalPath(
  raw: string | null | undefined,
  fallback = "/",
): string {
  if (typeof raw !== "string" || raw.length === 0) return fallback;

  // Doit être un chemin absolu à la racine. Exclut d'emblée les URLs
  // absolues (`https://…`) et le userinfo-trick (`@evil.com`).
  if (raw[0] !== "/") return fallback;

  // Rejette protocol-relative (`//`) et backslash-escape (`/\`), que les
  // navigateurs traitent comme des sauts d'origine.
  if (raw[1] === "/" || raw[1] === "\\") return fallback;

  // Défense en profondeur : on résout contre une origine sentinelle et on
  // vérifie qu'on n'en sort pas (encodages exotiques, caractères de
  // contrôle, etc.). On renvoie la forme normalisée (path + query + hash).
  try {
    const probe = new URL(raw, "https://internal.peyi.invalid");
    if (probe.origin !== "https://internal.peyi.invalid") return fallback;
    return `${probe.pathname}${probe.search}${probe.hash}`;
  } catch {
    return fallback;
  }
}
