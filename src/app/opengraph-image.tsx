import { ImageResponse } from "next/og";

/**
 * OG image racine servie à `/opengraph-image`. Next 14 la pose
 * automatiquement dans les `<meta property="og:image">` de la home
 * et de toute page qui n'a pas son propre `opengraph-image.tsx`.
 *
 * Pourquoi la générer dynamiquement plutôt qu'un PNG statique :
 *   - Zéro asset à maintenir : la vérité vit dans le code
 *   - Cohérence graphique garantie avec `icon.tsx` et `apple-icon.tsx`
 *   - Quand on ajustera le branding, une seule source change
 *
 * Edge runtime : pas d'accès DB ici, on bénéficie de la latence froide
 * minimale. Le rendu est cache côté Vercel.
 *
 * Format 1200×630 : ratio standard OG (Facebook, LinkedIn, WhatsApp,
 * iMessage). Twitter accepte aussi ce ratio en `summary_large_image`.
 */
export const runtime = "edge";
export const alt = "Péyi — bons plans et petites annonces de Guyane";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Satori (moteur derrière next/og) requiert `display: flex` sur tout
// élément parent. On garde les styles simples et vérifiés.

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          background: "linear-gradient(135deg, #FFF1E5 0%, #FFE0CB 100%)",
          fontFamily:
            "system-ui, -apple-system, Segoe UI, Helvetica, Arial, sans-serif",
        }}
      >
        {/* Logo row */}
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              width: 112,
              height: 112,
              borderRadius: 26,
              background:
                "linear-gradient(135deg, #FF914C 0%, #F57A2E 60%, #DB6418 100%)",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 76,
              fontWeight: 800,
              letterSpacing: "-0.04em",
            }}
          >
            P
          </div>
          <span
            style={{
              fontSize: 72,
              fontWeight: 800,
              color: "#1a1a1a",
              letterSpacing: "-0.03em",
            }}
          >
            Péyi
          </span>
        </div>

        {/* Tagline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <span
            style={{
              fontSize: 92,
              fontWeight: 800,
              color: "#1a1a1a",
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
            }}
          >
            Les bons plans
          </span>
          <span
            style={{
              fontSize: 92,
              fontWeight: 800,
              color: "#DB6418",
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
            }}
          >
            100% Guyane
          </span>
          <span
            style={{
              fontSize: 36,
              color: "#555",
              fontWeight: 500,
              marginTop: 8,
              display: "flex",
            }}
          >
            Partage, vote, et profite des meilleures promos près de chez toi
          </span>
        </div>

        {/* Footer URL */}
        <span
          style={{
            fontSize: 32,
            color: "#DB6418",
            fontWeight: 700,
            display: "flex",
          }}
        >
          peyi.com
        </span>
      </div>
    ),
    { ...size },
  );
}
