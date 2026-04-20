import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AVATAR_BUCKET } from "@/lib/storage/signed-upload";

/**
 * Suppression best-effort d'une image d'avatar à partir de son URL publique.
 * Échoue silencieusement : un blob orphelin est un problème bien moindre
 * qu'un update profil qui plante.
 *
 * Le flux d'upload moderne pousse le blob côté client via signed URL
 * (cf. `uploadFileDirect` + `signAvatarUpload`) ; cette fonction n'est
 * appelée que pour le nettoyage de l'ancienne photo lors d'un remplacement
 * ou d'un retrait explicite.
 */
export async function removeAvatarImage(publicUrl: string): Promise<void> {
  const marker = `/${AVATAR_BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return;

  const path = publicUrl.slice(idx + marker.length);
  const supabase = await createSupabaseServerClient();
  await supabase.storage.from(AVATAR_BUCKET).remove([path]);
}
