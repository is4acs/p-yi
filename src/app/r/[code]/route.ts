import { NextResponse, type NextRequest } from "next/server";

import {
  AFFILIATE_COOKIE_NAME,
  AFFILIATE_COOKIE_OPTIONS,
} from "@/lib/affiliate/cookies";
import { isValidCodeFormat } from "@/lib/affiliate/code";
import { recordAffiliateClick } from "@/lib/affiliate/track";

/**
 * Point d'entrée public des liens d'invitation :
 *
 *   https://peyi.app/r/<code>             → pose cookie + redirect vers /
 *   https://peyi.app/r/<code>?to=/bons-plans  → pose cookie + redirect vers /bons-plans
 *
 * Enregistre le clic en DB (hashé pour RGPD) et pose un cookie 30 j
 * qui sera lu lors du signup pour créer la `Referral`.
 *
 * La destination doit être un path relatif (commence par `/`), sinon on
 * redirige vers la home — évite un usage en open redirect.
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, props: { params: Promise<{ code: string }> }) {
  const params = await props.params;
  const code = params.code;
  const rawTo = request.nextUrl.searchParams.get("to");
  const landing =
    rawTo && rawTo.startsWith("/") && !rawTo.startsWith("//") ? rawTo : "/";

  // Enregistrement en DB (non bloquant côté UX mais on attend pour avoir
  // l'IP et le User-Agent accessibles via headers()).
  await recordAffiliateClick(code, landing);

  const response = NextResponse.redirect(new URL(landing, request.url));

  if (isValidCodeFormat(code)) {
    response.cookies.set(AFFILIATE_COOKIE_NAME, code, AFFILIATE_COOKIE_OPTIONS);
  }

  return response;
}
