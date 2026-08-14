import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureUserProfile } from "@/lib/auth/ensure-profile";
import { safeInternalPath } from "@/lib/safe-redirect";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // `next` est contrôlé par l'appelant → on le contraint à un chemin
  // interne pour empêcher un open redirect (`?next=@evil.com` etc.).
  const next = safeInternalPath(searchParams.get("next"), "/bons-plans");

  // Supabase may also redirect here with an explicit error param on
  // invalid/expired links. Log the detail server-side; the UI receives a
  // CODE (jamais de texte libre en query — cf. lib/auth/errors.ts).
  const supabaseError =
    searchParams.get("error_description") ?? searchParams.get("error");
  if (supabaseError) {
    console.error("[auth/callback] supabase error param:", supabaseError);
    return NextResponse.redirect(`${origin}/connexion?error=link_invalid`);
  }

  if (!code) {
    console.error("[auth/callback] no ?code param");
    return NextResponse.redirect(`${origin}/connexion?error=link_invalid`);
  }

  // Diagnostic : si le cookie PKCE verifier n'a pas voyagé jusqu'ici,
  // l'échange va échouer. On log les noms des cookies sb-* reçus pour
  // pouvoir poster-mortem distinguer « cookie absent » (cross-site
  // stripping Safari) de « cookie présent mais invalide ».
  const sbCookies = (await cookies())
    .getAll()
    .filter((c) => c.name.startsWith("sb-"))
    .map((c) => c.name);
  const hasVerifier = sbCookies.some((n) => n.endsWith("-code-verifier"));

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("[auth/callback] exchangeCodeForSession failed:", {
      message: error.message,
      status: error.status,
      sbCookies,
      hasVerifier,
      userAgent: request.headers.get("user-agent"),
    });

    // Si le verifier est absent, c'est quasi-certainement un blocage
    // cookie (Safari ITP, navigation privée, bloqueur). Code UX
    // explicite plutôt que l'opaque « PKCE code verifier not found ».
    const errorCode = !hasVerifier ? "cookies_blocked" : "link_invalid";
    return NextResponse.redirect(
      `${origin}/connexion?error=${errorCode}`,
    );
  }

  const profile = await ensureUserProfile();
  if (!profile) {
    // OAuth first login without a chosen username — collect one now,
    // en conservant la destination d'origine.
    return NextResponse.redirect(
      `${origin}/auth/complete-profile?next=${encodeURIComponent(next)}`,
    );
  }
  return NextResponse.redirect(`${origin}${next}`);
}
