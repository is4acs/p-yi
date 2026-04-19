/**
 * Constantes partagées pour le cookie de parrainage.
 *
 * Le cookie est posé dès qu'un visiteur atterrit avec `?ref=<code>` ou
 * via `/r/<code>`. Il persiste 30 jours : si le filleul s'inscrit dans
 * ce délai, le parrainage est attribué. Au-delà, le lien expire
 * silencieusement.
 */

export const AFFILIATE_COOKIE_NAME = "peyi_ref";
export const AFFILIATE_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 jours

export const AFFILIATE_COOKIE_OPTIONS = {
  httpOnly: false, // lisible côté client pour afficher un badge "parrainé par"
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: AFFILIATE_COOKIE_MAX_AGE_SECONDS,
};
