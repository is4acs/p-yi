import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";
import {
  AFFILIATE_COOKIE_NAME,
  AFFILIATE_COOKIE_OPTIONS,
} from "@/lib/affiliate/cookies";
import { isValidCodeFormat } from "@/lib/affiliate/code-format";

/**
 * Middleware global :
 *  1. Rafraîchit la session Supabase (cookies JWT) — obligatoire, sinon
 *     les tokens expirent et les users se retrouvent déconnectés.
 *  2. Filet OAuth : si Supabase nous renvoie le `?code=…` (ou un
 *     `?error=…` d'auth) sur une route autre que `/auth/callback`,
 *     on forwarde vers le callback. Cause typique : la Site URL du
 *     projet Supabase pointe sur la racine ou un sous-domaine (www)
 *     qui ne matche pas le `redirectTo` → Supabase fallback sur la
 *     Site URL et on perd le code. Plutôt que de laisser l'user
 *     coincé sur la home avec `?code=…`, on récupère le flow.
 *  3. Capture le paramètre `?ref=<code>` s'il est présent : on pose un
 *     cookie de parrainage valide 30 j, utilisé à l'inscription pour
 *     attribuer le filleul. On vérifie juste le format du code ici (pas
 *     de DB, Edge runtime) — la validité réelle est re-contrôlée lors
 *     de l'attribution.
 *
 * La route `/r/[code]` est le canal principal pour les liens
 * d'affiliation (tracking complet + cookie). Le `?ref=` reste supporté
 * pour les cas où le code arrive via un deep link d'une campagne tierce.
 */
export async function middleware(request: NextRequest) {
  // Filet OAuth : doit passer avant updateSession, sinon on consomme
  // inutilement un tour de getUser() sur le chemin racine.
  const { pathname, searchParams } = request.nextUrl;
  const oauthCode = searchParams.get("code");
  const oauthError =
    searchParams.get("error_description") ?? searchParams.get("error");

  const isAuthRoute =
    pathname === "/auth/callback" ||
    pathname === "/auth/confirm" ||
    pathname.startsWith("/auth/callback/") ||
    pathname.startsWith("/auth/confirm/");

  // Un `?code=` UUID-ish en dehors des routes /auth/* = très
  // probablement un callback OAuth mal routé par la Site URL Supabase.
  // On ne filtre pas sur le format pour rester tolérant (certains codes
  // Supabase ne sont pas des UUIDs parfaits) mais on exige au moins
  // 16 caractères pour éviter les faux positifs (ex. `?code=FR25`).
  if (!isAuthRoute && (oauthError || (oauthCode && oauthCode.length >= 16))) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/auth/callback";
    // On garde tous les search params (code, state, error, etc.)
    return NextResponse.redirect(redirectUrl);
  }

  const response = await updateSession(request);

  const ref = searchParams.get("ref");
  if (
    ref &&
    isValidCodeFormat(ref) &&
    !request.cookies.has(AFFILIATE_COOKIE_NAME)
  ) {
    response.cookies.set(AFFILIATE_COOKIE_NAME, ref, AFFILIATE_COOKIE_OPTIONS);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Run on every path except:
     * - _next/static (build assets)
     * - _next/image (image optimizer)
     * - favicon, sitemap, robots
     * - common image/font files served from /public
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff|woff2)$).*)",
  ],
};
