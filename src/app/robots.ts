import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/site-url";

/**
 * `robots.txt` servi à `/robots.txt`. Next 14 sérialise le tableau
 * `rules` en syntaxe standard attendue par les crawlers.
 *
 * Politique :
 *   - `Allow: /` comme règle générale — tout le contenu public est
 *     indexable par défaut.
 *   - On bloque explicitement les sections privées (profil, messages,
 *     notifications, admin, api).
 *   - Les pages publiques mais non stratégiques SEO (connexion,
 *     recherche interne, flows auth/poster, etc.) restent crawlables
 *     et portent une balise meta `noindex` côté page. Cela évite les
 *     cas où Google indexe une URL "bloquée par robots.txt" sans avoir
 *     lu son `noindex`.
 *   - `sitemap` pointe vers notre sitemap dynamique pour que le
 *     crawler n'ait pas à le deviner.
 *
 * On utilise un seul user-agent `*` ; si un jour on doit gérer des
 * règles fines (ex. interdire un scraper abusif), on pourra ajouter
 * des entrées ciblées. `ChatGPT-User`, `GPTBot`, etc. peuvent être
 * gérés ici si Isaac veut bloquer l'entraînement LLM sur le contenu
 * — pour l'instant on laisse tout passer car le contenu communautaire
 * gagne de la visibilité à être cité dans les réponses IA.
 */
export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/",
          "/profil",
          "/profil/",
          "/messages",
          "/messages/",
          "/notifications",
          "/notifications/",
          "/api/",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
