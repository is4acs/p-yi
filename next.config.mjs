/**
 * Péyi — configuration Next.js
 *
 * Pour l'essentiel on s'appuie sur les defaults. Deux blocs notables :
 *  1. `images.remotePatterns` : whitelist des hôtes distants autorisés par
 *     `next/image`. On autorise Supabase Storage (avatars, images annonces
 *     et bons plans). Si un jour on utilise un CDN externe (R2 listé dans
 *     `.env.example`), il faudra l'ajouter ici.
 *  2. `headers()` : en-têtes de sécurité appliqués à TOUTES les routes.
 *     Voir la section dédiée plus bas pour le détail et les compromis.
 */

// -----------------------------------------------------------------------------
// CSP — helpers
// -----------------------------------------------------------------------------

/**
 * Origine Supabase dérivée de l'env si disponible. Fallback sur un wildcard
 * `*.supabase.co` pour rester fonctionnel même si la var n'est pas fournie
 * au build (typique en preview Vercel avant merge du secret).
 */
function supabaseHosts() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    return { http: "https://*.supabase.co", ws: "wss://*.supabase.co" };
  }
  try {
    const { origin, host } = new URL(url);
    return { http: origin, ws: `wss://${host}` };
  } catch {
    return { http: "https://*.supabase.co", ws: "wss://*.supabase.co" };
  }
}

const isDev = process.env.NODE_ENV !== "production";

const SB = supabaseHosts();

/**
 * Content-Security-Policy.
 *
 * Choix de conception :
 *  - `'unsafe-inline'` sur `script-src` est nécessaire tant qu'on n'a pas
 *    mis en place un système de nonces via middleware. Next 14 + RSC émet
 *    des scripts inline pour l'hydratation ; sans `'unsafe-inline'` l'app
 *    ne boot pas. À migrer vers des nonces en même temps que Sentry (S23).
 *  - `'unsafe-eval'` uniquement en dev (React DevTools, Turbopack).
 *  - `'unsafe-inline'` sur `style-src` : Tailwind injecte des styles
 *    inline pour les variants dynamiques, et `next/font` aussi. Difficile
 *    à retirer sans casser du design.
 *  - `img-src` inclut `https:` pour les images OG externes et les
 *    previews d'URL des bons plans (qu'on ne connaît pas à l'avance).
 *    On peut resserrer si jamais on proxie tout via `next/image`.
 *  - `frame-ancestors 'none'` + `X-Frame-Options: DENY` en complément =
 *    anti-clickjacking robuste y compris sur vieux browsers.
 *  - `object-src 'none'` bloque les plugins Flash/PDF obsolètes.
 *  - `base-uri 'self'` empêche l'injection d'une balise `<base>` qui
 *    réécrirait toutes les URL relatives.
 *  - `form-action 'self'` empêche qu'un XSS poste un formulaire vers
 *    un domaine tiers.
 */
const csp = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob: https: ${SB.http}`,
  `font-src 'self' data:`,
  `connect-src 'self' ${SB.http} ${SB.ws}`,
  `manifest-src 'self'`,
  `worker-src 'self' blob:`,
  `media-src 'self' blob: data: ${SB.http}`,
  `frame-src 'self'`,
  `frame-ancestors 'none'`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  // `upgrade-insecure-requests` force la réécriture http:// → https:// pour
  // toute sous-ressource — utile si on récupère parfois des images dont
  // l'URL est saisie en http par un user.
  `upgrade-insecure-requests`,
].join("; ");

// -----------------------------------------------------------------------------
// Headers finaux
// -----------------------------------------------------------------------------

/**
 * En-têtes appliqués à toutes les routes. On ne distingue pas par path :
 * c'est plus facile à auditer et les coûts sont négligeables.
 *
 * HSTS avec `preload` + `includeSubDomains` : nécessite que le domaine
 * existe depuis assez longtemps en HTTPS avant de soumettre sur
 * hstspreload.org. Tant qu'on ne soumet pas, `max-age` d'un an est
 * réversible (rollback possible en repassant `max-age=0`).
 */
const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    // On désactive explicitement les APIs qu'on n'utilise pas. Si on ajoute
    // la géolocalisation (city picker par GPS) il faudra mettre `self`.
    key: "Permissions-Policy",
    value: [
      "camera=()",
      "microphone=()",
      "geolocation=()",
      "payment=()",
      "usb=()",
      "magnetometer=()",
      "gyroscope=()",
      "accelerometer=()",
    ].join(", "),
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
