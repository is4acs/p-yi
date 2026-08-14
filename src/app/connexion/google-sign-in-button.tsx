"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useMessages } from "@/components/soleil/I18nProvider";

/**
 * Bouton « Continuer avec Google ».
 *
 * Pourquoi un composant client plutôt qu'un Server Action ?
 *
 * Avec le flow PKCE (par défaut dans @supabase/ssr), `signInWithOAuth`
 * génère un *code verifier* qui doit être stocké côté navigateur AVANT
 * la redirection vers Google. Au retour (`/auth/callback`),
 * `exchangeCodeForSession` lit ce verifier dans les cookies pour finir
 * l'échange.
 *
 * En l'initiant depuis un Server Action, le verifier était posé via les
 * cookies de la réponse 303 — fragile : Next.js avalait silencieusement
 * l'écriture dans certains contextes, et la chaîne de redirections
 * (action → Supabase → Google → /auth/callback) pouvait perdre le cookie,
 * provoquant : « PKCE code verifier not found in storage ».
 *
 * Le client `@supabase/ssr` côté navigateur écrit le verifier
 * directement dans `document.cookie` (synchroniquement) avant de
 * naviguer vers Google — fiable.
 *
 * Pourquoi `skipBrowserRedirect: true` + navigation manuelle ?
 *
 * Sur mobile Safari / iOS Chrome (tous deux sous WebKit), le retour de
 * Google provoquait systématiquement une boucle « rien ne se passe ».
 * Cause : supabase-js fait la navigation lui-même via `window.location`
 * juste après avoir appelé `setAll()` sur l'adapter cookie ; dans
 * WebKit, ce chaînage (écriture document.cookie → navigation
 * immédiate) pouvait faire flusher la nav AVANT que le cookie verifier
 * soit réellement persisté. On récupère l'URL via `skipBrowserRedirect`,
 * on `await` pour laisser React flusher son tick (et donc le setAll),
 * puis on fait la navigation manuellement — le cookie est garanti écrit.
 */
export function GoogleSignInButton({ next }: { next?: string }) {
  const t = useMessages();
  const [loading, setLoading] = useState(false);

  // Retour depuis Google via le bouton « précédent » : Safari/Chrome
  // restaurent la page depuis le bfcache avec `loading=true` figé — le
  // bouton resterait bloqué sur son spinner. `pageshow(persisted)` le
  // réarme.
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setLoading(false);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  async function handleClick() {
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    // `next` est repassé au callback pour que l'utilisateur revienne là d'où
    // il venait. `/auth/callback` le revalide via `safeInternalPath` — on ne
    // fait donc jamais confiance à cette valeur côté serveur.
    const callback = new URL("/auth/callback", window.location.origin);
    if (next) callback.searchParams.set("next", next);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callback.toString(),
        skipBrowserRedirect: true,
      },
    });

    if (error || !data?.url) {
      // eslint-disable-next-line no-console
      console.error("[google-sign-in] signInWithOAuth failed:", error);
      setLoading(false);
      // Code d'erreur (traduit par la page), jamais de texte en query.
      window.location.href = "/connexion?error=google_failed";
      return;
    }

    // Laisse le microtask queue se vider pour que le cookie verifier
    // écrit par supabase-js soit commité dans document.cookie avant
    // qu'on quitte la page — crucial sur WebKit (iOS).
    await Promise.resolve();
    window.location.assign(data.url);
  }

  return (
    <button
      type="button"
      className="mt-5 flex min-h-[48px] w-full items-center justify-center gap-2.5 rounded-full border-[1.5px] border-soleil-border bg-soleil-input text-[14px] font-extrabold text-soleil-forest transition active:scale-[0.98] disabled:opacity-60 dark:border-soleil-border-d dark:bg-soleil-forest dark:text-soleil-cream"
      onClick={handleClick}
      disabled={loading}
      aria-busy={loading}
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
      ) : (
        <GoogleLogo className="h-5 w-5" />
      )}
      {t.auth.googleCta}
    </button>
  );
}

function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className={className}>
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}
