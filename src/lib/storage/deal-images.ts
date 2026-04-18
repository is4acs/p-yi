import { createSupabaseServerClient } from "@/lib/supabase/server";

export const DEAL_BUCKET = "deals";

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
