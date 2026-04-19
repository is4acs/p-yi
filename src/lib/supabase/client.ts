import { createBrowserClient } from "@supabase/ssr";

import { env } from "@/lib/env";

/**
 * Client Supabase côté navigateur.
 *
 * On force explicitement les attributs de cookies PKCE / session :
 *   - `sameSite: "lax"` : survit au redirect top-level depuis Google
 *     (un `Strict` serait strippé, un `none` serait refusé par
 *     Safari iOS sans justification tracking).
 *   - `secure` : exigé par les navigateurs modernes dès qu'on est
 *     en HTTPS ; en dev localhost on retombe sur `false` pour
 *     ne pas casser le flow en http://.
 *   - `path: "/"` : sinon le cookie serait écrit avec le path de la
 *     page actuelle (ex. `/connexion`) et ne serait pas envoyé à
 *     `/auth/callback` au retour de Google → « PKCE verifier not
 *     found », symptôme remonté sur mobile Safari.
 *
 * Ces valeurs sont les défauts de @supabase/ssr en théorie, mais
 * on les fixe en dur pour se prémunir d'un changement de default
 * entre deux versions du SDK.
 */
export const createSupabaseBrowserClient = () => {
  const isHttps =
    typeof window !== "undefined" && window.location.protocol === "https:";

  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookieOptions: {
        sameSite: "lax",
        secure: isHttps,
        path: "/",
      },
    },
  );
};
