import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DEAL_BUCKET, dealStoragePath } from "@/lib/storage/deal-image-path";

export { DEAL_BUCKET, dealStoragePath };

/**
 * Removes a deal image by its public URL. Best-effort — returns silently
 * on failure so the caller (e.g. delete-deal action) can proceed.
 */
export async function removeDealImage(publicUrl: string): Promise<void> {
  const path = dealStoragePath(publicUrl);
  if (!path) return;

  const supabase = await createSupabaseServerClient();
  await supabase.storage.from(DEAL_BUCKET).remove([path]);
}

/**
 * Supprime en lot les objets storage correspondant aux URLs données.
 * Utilisé par la purge automatique des bons plans expirés, qui tourne
 * hors requête utilisateur : on passe donc par le client service-role
 * (`createSupabaseAdminClient`) plutôt que par le client cookie-based,
 * qui n'aurait aucune session sur laquelle s'appuyer.
 *
 * Best-effort : une image orpheline dans le bucket est moins grave
 * qu'un cron qui casse. Renvoie le nombre d'objets effectivement
 * supprimés (les lots en erreur ne sont pas comptés).
 */
export async function removeDealImages(publicUrls: string[]): Promise<number> {
  const paths = publicUrls
    .map(dealStoragePath)
    .filter((p): p is string => Boolean(p));
  if (paths.length === 0) return 0;

  const supabase = createSupabaseAdminClient();
  // Supabase accepte des lots généreux, mais on borne à 100 pour rester
  // sous la taille max de payload et garder des erreurs lisibles.
  const BATCH = 100;
  let removed = 0;
  for (let i = 0; i < paths.length; i += BATCH) {
    const batch = paths.slice(i, i + BATCH);
    const { error } = await supabase.storage.from(DEAL_BUCKET).remove(batch);
    if (!error) removed += batch.length;
  }
  return removed;
}

/**
 * Vide intégralement le dossier `deals/<userId>/` du bucket Supabase.
 * Utilisé lors de la suppression d'un compte (RGPD — droit à l'oubli).
 * Best-effort, ne throw jamais — voir la jumelle dans listing-images.
 */
export async function removeAllDealImagesForUser(userId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
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
