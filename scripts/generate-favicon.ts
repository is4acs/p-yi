/**
 * generate-favicon.ts — génère `src/app/favicon.ico` depuis un SVG inline.
 *
 * Pourquoi un script et pas un asset statique ? Le favicon doit rester
 * cohérent avec `src/app/icon.tsx` (même gradient, même "P", même radius).
 * Si la marque évolue, on met à jour le SVG ci-dessous et on relance :
 *
 *   npm run favicon:generate
 *
 * Le .ico contient 3 tailles (16, 32, 48) packagées dans le même fichier.
 * Les navigateurs modernes pickent la bonne taille. Next.js 14 sert le
 * fichier à `/favicon.ico` via la convention App Router.
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";

import { Resvg } from "@resvg/resvg-js";
import pngToIco from "png-to-ico";

// ── Source SVG ─────────────────────────────────────────────────────────
// Doit rester aligné sur `src/app/icon.tsx` :
//  - gradient 135° orange Solèy (#FF914C → #F57A2E → #DB6418)
//  - radius 22% (rounded square)
//  - "P" blanc bold centré
//
// Dimensions viewBox 512×512 (identiques à icon.tsx). Resvg gère le
// rescale propre pour les cibles 16/32/48.
const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FF914C"/>
      <stop offset="60%" stop-color="#F57A2E"/>
      <stop offset="100%" stop-color="#DB6418"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="113" ry="113" fill="url(#g)"/>
  <text x="50%" y="50%"
        font-family="system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif"
        font-weight="800"
        font-size="340"
        fill="white"
        text-anchor="middle"
        dominant-baseline="central"
        letter-spacing="-13">P</text>
</svg>`;

const SIZES = [16, 32, 48];
const OUTPUT = path.resolve(__dirname, "..", "src", "app", "favicon.ico");

async function main() {
  console.log("📐 Rasterisation SVG → PNG pour chaque taille…");
  const pngBuffers = SIZES.map((size) => {
    const resvg = new Resvg(SVG, {
      fitTo: { mode: "width", value: size },
      font: { loadSystemFonts: true },
    });
    const png = resvg.render().asPng();
    console.log(`  ✓ ${size}×${size}  (${png.length} bytes)`);
    return png;
  });

  console.log("📦 Packaging des PNG dans un .ico multi-tailles…");
  const ico = await pngToIco(pngBuffers);

  await writeFile(OUTPUT, ico);
  console.log(`✅ Favicon généré : ${OUTPUT} (${ico.length} bytes)`);
}

main().catch((err) => {
  console.error("❌ Échec génération favicon :", err);
  process.exit(1);
});
