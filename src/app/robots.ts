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
 *     notifications, admin, api, auth, connexion, banni). Même si ces
 *     routes sont authentifiées et que les crawlers ne verraient que
 *     des redirections, noindex via robots est un double filet.
 *   - `sitemap` pointe vers notre sitemap dynamique pour que le
 *     crawler n'ait pas à le deviner.
 *
 * Note : `/poster` n'est PAS disallow — Google peut afficher la page
 * de création (qui redirige vers login en fait), et c'est OK pour la
 * découverte. Idem `/auth/complete-profile` qui est une étape de
 * flow, pas du contenu.
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
          "/poster",
          "/poster/",
          "/recherche",
          "/api/",
          "/auth/",
          "/connexion",
          "/banni",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
