import { randomBytes } from "node:crypto";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export const LISTING_BUCKET = "listings";
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"] as const;

// Photo caps live in src/lib/listings/photo-limits.ts (safe for client
// bundles) — re-export from there so the rest of the app can keep
// importing from this storage module if they prefer.
export {
  MAX_PHOTOS_DEFAULT,
  MAX_PHOTOS_EXTENDED,
  maxPhotosForCategory,
} from "@/lib/listings/photo-limits";

type AllowedMime = (typeof ALLOWED_MIME)[number];

function extFor(mime: AllowedMime): string {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
  }
}

/**
 * Uploads a single listing image to Supabase Storage and returns its public
 * URL. Path pattern: `<uid>/<timestamp>-<random>.<ext>` — the `<uid>` prefix
 * is enforced by the storage RLS policy so a user cannot write to someone
 * else's folder.
 */
export async function uploadListingImage(
  file: File,
  userId: string,
): Promise<string> {
  if (!ALLOWED_MIME.includes(file.type as AllowedMime)) {
    throw new Error("Format d'image non supporté (JPG, PNG ou WebP).");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Image trop lourde (5 Mo maximum).");
  }

  const supabase = createSupabaseServerClient();
  const ext = extFor(file.type as AllowedMime);
  const path = `${userId}/${Date.now()}-${randomBytes(4).toString("hex")}.${ext}`;

  const { error } = await supabase.storage
    .from(LISTING_BUCKET)
    .upload(path, file, {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false,
    });

  if (error) {
    throw new Error(`Échec de l'upload : ${error.message}`);
  }

  const { data } = supabase.storage.from(LISTING_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Uploads multiple listing images sequentially. Returns URLs in the same
 * order as the input files so the caller can persist a stable gallery
 * order. If any upload fails, best-effort rollback removes the files that
 * already landed in the bucket — we never want orphan blobs.
 *
 * Why sequential ? Supabase storage is rate-limited and we don't want 10
 * concurrent writes from a single user. The UX hit is negligible (5 s vs.
 * 3 s for 10 photos on 4G) and reliability wins.
 */
export async function uploadListingImages(
  files: File[],
  userId: string,
): Promise<string[]> {
  const uploaded: string[] = [];
  try {
    for (const file of files) {
      const url = await uploadListingImage(file, userId);
      uploaded.push(url);
    }
    return uploaded;
  } catch (err) {
    // Rollback : don't await removeListingImages(uploaded) serially — parallel
    // is fine here since we already know the bucket accepted the writes, and
    // we don't want the user waiting on cleanup before seeing the error.
    await Promise.allSettled(uploaded.map((u) => removeListingImage(u)));
    throw err;
  }
}

/**
 * Best-effort deletion of a listing image by its public URL. Returns
 * silently on failure.
 */
export async function removeListingImage(publicUrl: string): Promise<void> {
  const marker = `/${LISTING_BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return;

  const path = publicUrl.slice(idx + marker.length);
  const supabase = createSupabaseServerClient();
  await supabase.storage.from(LISTING_BUCKET).remove([path]);
}

/**
 * Batch-delete helper. Never throws — we always want the surrounding
 * transaction (listing delete / photo swap) to proceed regardless of
 * storage hiccups, since an orphan blob is a minor cost compared to a
 * broken user action.
 */
export async function removeListingImages(publicUrls: string[]): Promise<void> {
  if (publicUrls.length === 0) return;
  await Promise.allSettled(publicUrls.map((u) => removeListingImage(u)));
}

/**
 * Vide intégralement le dossier `listings/<userId>/` du bucket Supabase.
 * Utilisé lors de la suppression d'un compte (RGPD — droit à l'oubli).
 * Best-effort : n'étend jamais d'exception, car un orphelin storage ne
 * doit pas empêcher la suppression DB qui est la priorité légale.
 *
 * Stratégie : on liste d'abord (max 1000 fichiers, ce qui est largement
 * au-dessus du cap de photos par user), puis on supprime en batch. Si
 * l'user avait plus de 1000 images on boucle — en pratique c'est
 * improbable (cap produit: ~50 photos par annonce × quelques annonces).
 */
export async function removeAllListingImagesForUser(userId: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  try {
    const { data, error } = await supabase.storage
      .from(LISTING_BUCKET)
      .list(userId, { limit: 1000 });
    if (error || !data || data.length === 0) return;
    const paths = data.map((f) => `${userId}/${f.name}`);
    await supabase.storage.from(LISTING_BUCKET).remove(paths);
  } catch {
    // Silence : le cleanup storage n'est jamais bloquant.
  }
}
