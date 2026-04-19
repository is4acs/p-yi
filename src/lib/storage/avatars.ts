import { randomBytes } from "node:crypto";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export const AVATAR_BUCKET = "avatars";
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB
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
 * Uploads a user avatar to Supabase Storage and returns its public URL.
 * Path pattern: `<uid>/<timestamp>-<random>.<ext>` — the `<uid>` prefix is
 * enforced by the storage RLS policy so a user cannot write to someone
 * else's folder.
 */
export async function uploadAvatarImage(
  file: File,
  userId: string,
): Promise<string> {
  if (!ALLOWED_MIME.includes(file.type as AllowedMime)) {
    throw new Error("Format d'image non supporté (JPG, PNG ou WebP).");
  }
  if (file.size > MAX_AVATAR_BYTES) {
    throw new Error("Image trop lourde (2 Mo maximum).");
  }

  const supabase = await createSupabaseServerClient();
  const ext = extFor(file.type as AllowedMime);
  const path = `${userId}/${Date.now()}-${randomBytes(4).toString("hex")}.${ext}`;

  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false,
    });

  if (error) {
    throw new Error(`Échec de l'upload : ${error.message}`);
  }

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Best-effort deletion of an avatar image by its public URL. Returns
 * silently on failure — a stale blob is a much smaller problem than a
 * broken profile update.
 */
export async function removeAvatarImage(publicUrl: string): Promise<void> {
  const marker = `/${AVATAR_BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return;

  const path = publicUrl.slice(idx + marker.length);
  const supabase = await createSupabaseServerClient();
  await supabase.storage.from(AVATAR_BUCKET).remove([path]);
}
