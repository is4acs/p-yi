import { randomBytes } from "node:crypto";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export const DEAL_BUCKET = "deals";
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"] as const;

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
 * Uploads a deal cover image to Supabase Storage and returns its public URL.
 * Path pattern: `<uid>/<timestamp>-<random>.<ext>` — the `<uid>` prefix is
 * enforced by the storage RLS policy so a user cannot write to someone
 * else's folder.
 */
export async function uploadDealImage(
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
    .from(DEAL_BUCKET)
    .upload(path, file, {
      contentType: file.type,
      cacheControl: "31536000", // 1 year (immutable filenames)
      upsert: false,
    });

  if (error) {
    throw new Error(`Échec de l'upload : ${error.message}`);
  }

  const { data } = supabase.storage.from(DEAL_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Removes a deal image by its public URL. Best-effort — returns silently
 * on failure so the caller (e.g. delete-deal action) can proceed.
 */
export async function removeDealImage(publicUrl: string): Promise<void> {
  const marker = `/${DEAL_BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return;

  const path = publicUrl.slice(idx + marker.length);
  const supabase = createSupabaseServerClient();
  await supabase.storage.from(DEAL_BUCKET).remove([path]);
}

/**
 * Vide intégralement le dossier `deals/<userId>/` du bucket Supabase.
 * Utilisé lors de la suppression d'un compte (RGPD — droit à l'oubli).
 * Best-effort, ne throw jamais — voir la jumelle dans listing-images.
 */
export async function removeAllDealImagesForUser(userId: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  try {
    const { data, error } = await supabase.storage
      .from(DEAL_BUCKET)
      .list(userId, { limit: 1000 });
    if (error || !data || data.length === 0) return;
    const paths = data.map((f) => `${userId}/${f.name}`);
    await supabase.storage.from(DEAL_BUCKET).remove(paths);
  } catch {
    // Silence.
  }
}
