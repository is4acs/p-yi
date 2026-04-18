"use client";

import { useEffect } from "react";

/**
 * Fallback ultime. Next rend ce composant quand le **root layout** lui-même
 * lève une exception — i.e. avant que notre `<Header>`/`<BottomNav>` aient
 * eu la chance de s'hydrater.
 *
 * Contraintes Next pour ce fichier :
 *  - Doit être un Client Component.
 *  - Doit rendre son propre `<html>` et `<body>` car le root layout n'est
 *    pas monté.
 *  - Doit rester auto-suffisant : pas d'import de composants du design
 *    system (ils pourraient être la cause du crash). On style inline.
 *
 * Garde ce fichier volontairement minimaliste. Tout le reste des erreurs
 * (404, crash d'une page isolée) est géré par `not-found.tsx` et
 * `error.tsx`.
 */
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app/global-error]", error);
  }, [error]);

  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          fontFamily:
            "system-ui, -apple-system, Segoe UI, Helvetica, Arial, sans-serif",
          background: "#FFFFFF",
          color: "#111",
        }}
      >
        <div style={{ maxWidth: 480, textAlign: "center" }}>
          <div
            aria-hidden
            style={{
              width: 64,
              height: 64,
              margin: "0 auto",
              borderRadius: 999,
              background: "#FFF1E5",
              color: "#DB6418",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              fontWeight: 700,
            }}
          >
            !
          </div>
          <h1
            style={{
              marginTop: 16,
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            Erreur critique
          </h1>
          <p style={{ marginTop: 8, color: "#555", fontSize: 14 }}>
            L&apos;application a rencontré un problème irrécupérable. Recharge
            la page. Si ça persiste, reviens dans quelques minutes.
          </p>
          {error.digest && (
            <p
              style={{
                marginTop: 8,
                color: "#888",
                fontSize: 12,
                fontFamily:
                  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              }}
            >
              Code : {error.digest}
            </p>
          )}
          <a
            href="/"
            style={{
              marginTop: 20,
              display: "inline-block",
              padding: "10px 16px",
              borderRadius: 999,
              background: "#FF914C",
              color: "white",
              fontWeight: 600,
              textDecoration: "none",
              fontSize: 14,
            }}
          >
            Retour à l&apos;accueil
          </a>
        </div>
      </body>
    </html>
  );
}
