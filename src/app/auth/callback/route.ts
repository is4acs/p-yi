import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureUserProfile } from "@/lib/auth/ensure-profile";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/bons-plans";

  // Supabase may also redirect here with an explicit error param on
  // invalid/expired links. Surface it rather than silently 302'ing.
  const supabaseError =
    searchParams.get("error_description") ?? searchParams.get("error");
  if (supabaseError) {
    console.error("[auth/callback] supabase error param:", supabaseError);
    return NextResponse.redirect(
      `${origin}/connexion?error=${encodeURIComponent(supabaseError)}`,
    );
  }

  if (!code) {
    console.error("[auth/callback] no ?code param");
    return NextResponse.redirect(
      `${origin}/connexion?error=${encodeURIComponent(
        "Lien invalide : code d'authentification manquant.",
      )}`,
    );
  }

  // Diagnostic : si le cookie PKCE verifier n'a pas voyagé jusqu'ici,
  // l'échange va échouer. On log les noms des cookies sb-* reçus pour
  // pouvoir poster-mortem distinguer « cookie absent » (cross-site
  // stripping Safari) de « cookie présent mais invalide ».
  const sbCookies = cookies()
    .getAll()
    .filter((c) => c.name.startsWith("sb-"))
    .map((c) => c.name);
  const hasVerifier = sbCookies.some((n) => n.endsWith("-code-verifier"));

  const supabase = createSupabaseServerClient();
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
    // cookie (Safari ITP, navigation privée, bloqueur). Message UX
    // explicite plutôt que l'opaque « PKCE code verifier not found ».
    const message = !hasVerifier
      ? "Ton navigateur a bloqué un cookie nécessaire à la connexion Google. " +
        "Active les cookies pour peyi.com ou utilise la connexion par e-mail."
      : error.message || "Lien invalide ou expiré.";

    return NextResponse.redirect(
      `${origin}/connexion?error=${encodeURIComponent(message)}`,
    );
  }

  const profile = await ensureUserProfile();
  if (!profile) {
    // OAuth first login without a chosen username — collect one now.
    return NextResponse.redirect(`${origin}/auth/complete-profile`);
  }
  return NextResponse.redirect(`${origin}${next}`);
}
