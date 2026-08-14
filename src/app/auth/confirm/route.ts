import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureUserProfile } from "@/lib/auth/ensure-profile";
import { safeInternalPath } from "@/lib/safe-redirect";

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
  // Contraint à un chemin interne : évite l'open redirect via `?next=`.
  const next = safeInternalPath(searchParams.get("next"), "/bons-plans");

  if (!token_hash || !type) {
    console.error("[auth/confirm] missing token_hash or type", {
      token_hash: Boolean(token_hash),
      type,
    });
    // Code, jamais de texte libre en query — cf. lib/auth/errors.ts.
    return NextResponse.redirect(`${origin}/connexion?error=link_invalid`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash });
  if (error) {
    console.error("[auth/confirm] verifyOtp failed:", error);
    return NextResponse.redirect(`${origin}/connexion?error=link_invalid`);
  }

  const profile = await ensureUserProfile();
  if (!profile) {
    // Conserve la destination d'origine à travers l'étape pseudo.
    return NextResponse.redirect(
      `${origin}/auth/complete-profile?next=${encodeURIComponent(next)}`,
    );
  }
  return NextResponse.redirect(`${origin}${next}`);
}
