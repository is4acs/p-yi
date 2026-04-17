import { ImageResponse } from "next/og";

/**
 * Maskable icon (Android adaptive icons). The spec requires the logo to sit
 * inside the inner 80% "safe zone" so any mask (circle, squircle, rounded
 * square) the OS applies never clips it. The full 512×512 is filled with a
 * solid brand color so cropping never exposes transparent pixels.
 *
 * NB : ce fichier est un *route handler* (`route.tsx`), pas un fichier
 * metadata `icon.tsx`. Les conventions Next `size` / `contentType` ne sont
 * donc PAS des exports valides ici — elles déclenchent un échec du build
 * ("size is not a valid Route export field"). Les dimensions sont passées
 * directement à `ImageResponse` qui produit un `Content-Type: image/png`
 * par défaut.
 */
export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#FF8A3D",
        }}
      >
        <div
          style={{
            width: "60%",
            height: "60%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background:
              "linear-gradient(135deg, #FFA05C 0%, #FF7A2A 60%, #F0610E 100%)",
            borderRadius: "22%",
            color: "white",
            fontFamily:
              "system-ui, -apple-system, Segoe UI, Helvetica, Arial, sans-serif",
            fontWeight: 800,
            fontSize: 220,
            letterSpacing: "-0.04em",
          }}
        >
          P
        </div>
      </div>
    ),
    { width: 512, height: 512 },
  );
}
