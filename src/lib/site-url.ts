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
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "NEXT_PUBLIC_SITE_URL manquante en production (URL canonique requise).",
      );
    }
    // En dev local uniquement, fallback ergonomique.
    return "http://localhost:3000";
  }
  return raw.replace(/\/$/, "");
}
