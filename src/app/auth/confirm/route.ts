import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureUserProfile } from "@/lib/auth/ensure-profile";

/**
 * Email confirmation endpoint using Supabase's `token_hash` + `verifyOtp`
 * flow. This avoids the PKCE code-verifier cookie problem entirely: the
 * token_hash is verified server-side against Supabase, so the user can
 * click the mail link from any device/browser and still get logged in.
 *
 * Requires the Supabase email templates to point here:
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type={{ .EmailActionType }}&next=/bons-plans
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/bons-plans";

  if (!token_hash || !type) {
    console.error("[auth/confirm] missing token_hash or type", {
      token_hash: Boolean(token_hash),
      type,
    });
    return NextResponse.redirect(
      `${origin}/connexion?error=${encodeURIComponent(
        "Lien invalide : paramètres manquants.",
      )}`,
    );
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash });
  if (error) {
    console.error("[auth/confirm] verifyOtp failed:", error);
    return NextResponse.redirect(
      `${origin}/connexion?error=${encodeURIComponent(
        error.message || "Lien invalide ou expiré.",
      )}`,
    );
  }

  const profile = await ensureUserProfile();
  if (!profile) {
    return NextResponse.redirect(`${origin}/auth/complete-profile`);
  }
  return NextResponse.redirect(`${origin}${next}`);
}
