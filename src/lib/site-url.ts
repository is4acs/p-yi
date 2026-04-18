import { env } from "@/lib/env";

/**
 * The canonical base URL of the running app. Used for building absolute
 * links in emails, OAuth redirects, and webhooks — anywhere we can't rely
 * on a request's Origin header.
 *
 * `NEXT_PUBLIC_SITE_URL` is validated upstream by `@/lib/env` (zod). If
 * elle est absente, l'app aura déjà throwé au démarrage. Ici on se
 * contente de retirer un éventuel slash final pour éviter les URLs en
 * `//path` une fois concatenées.
 */
export function getSiteUrl(): string {
  const raw = env.NEXT_PUBLIC_SITE_URL;
  if (!raw) {
    // Cas où la variable est optionnelle dans le schéma (on autorise
    // son absence en dev pour ne pas bloquer un nouveau contributeur
    // qui n'a pas encore tout configuré) — on retombe sur localhost.
    return "http://localhost:3000";
  }
  return raw.replace(/\/$/, "");
}
