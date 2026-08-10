import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ACTIVITY_BUCKET } from "@/lib/storage/signed-upload";

/**
 * Supprime des images d'activité par leurs URLs publiques. Best-effort —
 * silencieux en cas d'échec (même politique que deal-images) : on ne
 * bloque jamais une suppression de fiche pour un orphelin storage.
 * Client admin (service role) : le bucket est éditorial, il n'y a pas de
 * notion de propriétaire utilisateur.
 */
export async function removeActivityImages(publicUrls: string[]): Promise<void> {
  const marker = `/${ACTIVITY_BUCKET}/`;
  const paths = publicUrls
    .map((url) => {
      const idx = url.indexOf(marker);
      return idx === -1 ? null : url.slice(idx + marker.length);
    })
    .filter((path): path is string => Boolean(path));

  if (paths.length === 0) return;

  try {
    const supabase = createSupabaseAdminClient();
    await supabase.storage.from(ACTIVITY_BUCKET).remove(paths);
  } catch {
    // Silence — ramassé par un futur GC storage si besoin.
  }
}
