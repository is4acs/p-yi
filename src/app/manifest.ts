import type { MetadataRoute } from "next";

/**
 * PWA manifest served at `/manifest.webmanifest`. Next 14 picks it up from
 * this file automatically — no need to wire it into <head>.
 *
 * Design notes :
 *  - `start_url: "/bons-plans"` lands installed users on the main content,
 *    not the marketing home page.
 *  - `display: "standalone"` hides the browser chrome so Péyi looks like a
 *    real native app once installed.
 *  - `shortcuts` = the long-press menu on the icon (Android). iOS ignores
 *    them today but this will cost nothing to have ready.
 *  - Icons are generated dynamically by src/app/icon.tsx — the URLs below
 *    are the Next routes that produce the PNGs.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Péyi — Bons plans et annonces de Guyane",
    short_name: "Péyi",
    description:
      "Les bons plans et petites annonces 100% Guyane, dans ta poche.",
    start_url: "/bons-plans",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FFFFFF",
    theme_color: "#FF8A3D",
    categories: ["shopping", "lifestyle", "social"],
    lang: "fr",
    dir: "ltr",
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Poster une annonce",
        short_name: "Poster",
        description: "Vendre, échanger ou donner en un clic",
        url: "/poster",
        icons: [{ src: "/icon", sizes: "192x192" }],
      },
      {
        name: "Messagerie",
        short_name: "Messages",
        description: "Tes conversations privées",
        url: "/messages",
        icons: [{ src: "/icon", sizes: "192x192" }],
      },
      {
        name: "Annonces",
        short_name: "Annonces",
        description: "Parcourir les petites annonces de Guyane",
        url: "/annonces",
        icons: [{ src: "/icon", sizes: "192x192" }],
      },
    ],
  };
}
