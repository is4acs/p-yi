/**
 * Compression d'images côté navigateur. Objectif :
 *   - réduire ~5 Mo de photo smartphone à ~200-500 Ko avant l'upload
 *   - éviter les timeouts Vercel sur connexion faible (60 s max sur Hobby)
 *   - économiser la bande passante du user (4G en Guyane = souvent cher)
 *
 * Stratégie :
 *   1. Charger le File en ImageBitmap (accéléré, pas de DOM <img>)
 *   2. Redimensionner si le plus grand côté dépasse `maxDim`
 *   3. Dessiner sur un canvas (OffscreenCanvas si dispo pour ne pas bloquer
 *      le main thread trop longtemps) et ré-encoder en JPEG à `quality`
 *      (ou WebP si l'input était déjà en WebP — on ne dégrade pas vers
 *      JPEG dans ce cas, WebP est toujours plus compact)
 *   4. Si pour une raison quelconque la compression produit un fichier
 *      *plus lourd* que l'original (rare : petites PNG vectorielles), on
 *      renvoie l'original pour ne pas dégrader.
 *
 * Fallback : si l'API `createImageBitmap` n'est pas dispo (très vieux
 * browser) ou si la compression échoue, on renvoie le File original.
 * L'upload reste possible, il sera juste plus lourd.
 */

export const MAX_DIM_DEFAULT = 1920;
export const QUALITY_DEFAULT = 0.82;

type CompressOptions = {
  /** Plus grand côté max en pixels. Défaut 1920 (HD+). */
  maxDim?: number;
  /** Qualité JPEG/WebP entre 0 et 1. Défaut 0.82 (sweet spot qualité/poids). */
  quality?: number;
};

async function blobFromCanvas(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  mime: string,
  quality: number,
): Promise<Blob | null> {
  if (canvas instanceof OffscreenCanvas) {
    try {
      return await canvas.convertToBlob({ type: mime, quality });
    } catch {
      return null;
    }
  }
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), mime, quality);
  });
}

export async function compressImage(
  file: File,
  options: CompressOptions = {},
): Promise<File> {
  const { maxDim = MAX_DIM_DEFAULT, quality = QUALITY_DEFAULT } = options;

  // On n'essaie de compresser que ce qu'on sait décoder. Les GIF animés
  // seraient massacrés, on les laisse passer tels quels (mais le serveur
  // les rejette de toute façon — MIME non autorisé).
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return file;
  }

  if (typeof createImageBitmap !== "function") return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  try {
    const { width: w0, height: h0 } = bitmap;
    const scale = Math.min(1, maxDim / Math.max(w0, h0));
    const width = Math.round(w0 * scale);
    const height = Math.round(h0 * scale);

    // Préfère OffscreenCanvas quand supporté pour ne pas forcer un paint
    // sur le main thread. Fallback sur un canvas DOM classique.
    let canvas: HTMLCanvasElement | OffscreenCanvas;
    if (typeof OffscreenCanvas !== "undefined") {
      canvas = new OffscreenCanvas(width, height);
    } else {
      const el = document.createElement("canvas");
      el.width = width;
      el.height = height;
      canvas = el;
    }

    const ctx = canvas.getContext("2d") as
      | CanvasRenderingContext2D
      | OffscreenCanvasRenderingContext2D
      | null;
    if (!ctx) return file;
    (ctx as CanvasRenderingContext2D).drawImage(bitmap, 0, 0, width, height);

    // WebP reste WebP (supérieur à JPEG à qualité égale). Tout le reste
    // (JPEG, PNG) finit en JPEG : conversion PNG → JPEG divise souvent
    // le poids par 3–5 sans perte visible sur des photos.
    const outMime = file.type === "image/webp" ? "image/webp" : "image/jpeg";
    const blob = await blobFromCanvas(canvas, outMime, quality);
    if (!blob) return file;

    // Safety net : si on a paradoxalement grossi le fichier, on garde l'original.
    if (blob.size >= file.size) return file;

    const newExt = outMime === "image/webp" ? "webp" : "jpg";
    const baseName = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${baseName}.${newExt}`, {
      type: outMime,
      lastModified: Date.now(),
    });
  } finally {
    bitmap.close?.();
  }
}
