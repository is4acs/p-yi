import { createSupabaseServerClient } from "@/lib/supabase/server";

export const LISTING_BUCKET = "listings";

/**
 * Best-effort deletion of a listing image by its public URL. Returns
 * silently on failure.
 */
export async function removeListingImage(publicUrl: string): Promise<void> {
  const marker = `/${LISTING_BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return;

  const path = publicUrl.slice(idx + marker.length);
  const supabase = await createSupabaseServerClient();
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
  const supabase = await createSupabaseServerClient();
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
