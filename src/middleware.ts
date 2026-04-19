import type { NextRequest } from "next/server";

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
 *  2. Capture le paramètre `?ref=<code>` s'il est présent : on pose un
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
  const response = await updateSession(request);

  const ref = request.nextUrl.searchParams.get("ref");
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
