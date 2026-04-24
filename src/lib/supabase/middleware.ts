import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { withTimeout } from "@/lib/async/with-timeout";
import { env } from "@/lib/env";

type CookieToSet = { name: string; value: string; options: CookieOptions };
const SUPABASE_MIDDLEWARE_TIMEOUT_MS = 2_500;

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Touching getUser() refreshes the session cookie if needed.
  // Do not remove: without it, tokens expire and users get silently logged out.
  // Timeout guard: si Supabase auth ralentit, on préfère laisser passer la
  // requête sans refresh de session plutôt que faire tomber toute la route.
  try {
    await withTimeout(
      supabase.auth.getUser(),
      SUPABASE_MIDDLEWARE_TIMEOUT_MS,
      "middleware/supabase-get-user",
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[middleware] supabase session refresh failed", err);
  }

  return supabaseResponse;
}
