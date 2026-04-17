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

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("[auth/callback] exchangeCodeForSession failed:", error);
    return NextResponse.redirect(
      `${origin}/connexion?error=${encodeURIComponent(
        error.message || "Lien invalide ou expiré.",
      )}`,
    );
  }

  const profile = await ensureUserProfile();
  if (!profile) {
    // OAuth first login without a chosen username — collect one now.
    return NextResponse.redirect(`${origin}/auth/complete-profile`);
  }
  return NextResponse.redirect(`${origin}${next}`);
}
