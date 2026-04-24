/**
 * Next.js utilise des exceptions "sentinelles" pour piloter le contrôle
 * de flux côté serveur :
 *   - `redirect()` jette une erreur avec `digest` qui commence par
 *     `NEXT_REDIRECT;...` — Next la reconnaît plus haut dans la stack
 *     et émet le 307 vers la nouvelle URL.
 *   - `notFound()` jette `NEXT_NOT_FOUND` — Next monte la page
 *     `not-found.tsx` à la place.
 *   - L'accès à `cookies()` / `headers()` / `searchParams` pendant le
 *     prerender statique jette `DYNAMIC_SERVER_USAGE` — Next bascule
 *     la route en dynamic rendering.
 *
 * Si on les avale dans un `try/catch` (par ex. pour absorber un crash
 * Prisma dans le RootLayout), on casse ces mécanismes :
 *   - les redirects deviennent des renders blancs,
 *   - les notFound rendent la page normalement avec data null,
 *   - les routes statiques crashent au build avec
 *     `Dynamic server usage: Route … couldn't be rendered statically
 *     because it used cookies`.
 *
 * Cette fonction relève l'erreur si elle ressemble à une sentinelle
 * Next, sinon ne fait rien — l'appelant continue son flow normal.
 */
export function rethrowIfNextInternal(err: unknown): void {
  if (!err || typeof err !== "object") return;

  const digest = (err as { digest?: unknown }).digest;
  if (typeof digest === "string") {
    if (
      digest === "DYNAMIC_SERVER_USAGE" ||
      digest === "NEXT_NOT_FOUND" ||
      digest === "BAILOUT_TO_CLIENT_SIDE_RENDERING" ||
      digest.startsWith("NEXT_REDIRECT")
    ) {
      throw err;
    }
  }

  // Fallback sur la classe — utile pour les vieilles versions de Next
  // qui n'utilisent pas encore systématiquement le digest string.
  const name = (err as { name?: unknown }).name;
  if (
    name === "DynamicServerError" ||
    name === "RedirectError" ||
    name === "NotFoundError"
  ) {
    throw err;
  }
}
