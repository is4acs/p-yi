import { createSupabaseBrowserClient } from "@/lib/supabase/client";

import { compressImage } from "./image-compress";

export type UploadKind = "deal" | "listing" | "avatar";

type SignedUrl = {
  path: string;
  token: string;
  publicUrl: string;
};

const BUCKETS: Record<UploadKind, string> = {
  deal: "deals",
  listing: "listings",
  avatar: "avatars",
};

async function requestSignedUrls(
  kind: UploadKind,
  mimes: string[],
): Promise<SignedUrl[]> {
  const res = await fetch("/api/upload/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, mimes }),
  });
  if (!res.ok) {
    let message = "Impossible de préparer l'upload.";
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      /* swallow */
    }
    throw new Error(message);
  }
  const body = (await res.json()) as { urls: SignedUrl[] };
  return body.urls;
}

/**
 * Compresse `files` dans le navigateur, demande des URLs d'upload signées
 * au serveur, puis pousse chaque fichier directement vers Supabase Storage.
 * Renvoie la liste des URLs publiques dans le même ordre que `files`.
 *
 * Pourquoi ce design :
 *   - Vercel ne voit plus passer les bytes → plus de timeout 60 s sur
 *     connexions faibles, plus de facturation bande passante entrante.
 *   - Compression côté client → un iPhone qui prend des JPEG à 4 Mo les
 *     envoie à ~300-500 Ko, l'upload est 10× plus rapide.
 *   - Uploads parallèles → 10 photos passent en temps du plus lent,
 *     pas en somme (vs. boucle serveur séquentielle précédente).
 *
 * Si une étape échoue pour un fichier donné, la fonction throw pour que
 * l'UI remonte le message tel quel au user. On ne tente pas de rollback
 * des fichiers déjà uploadés ici : côté serveur, seuls les URLs listés
 * dans le formulaire final seront persistés, les orphelins se font
 * ramasser par le prochain job de GC (à ajouter en S22 si besoin).
 */
export async function uploadFilesDirect(
  kind: UploadKind,
  files: File[],
  onProgress?: (done: number, total: number) => void,
): Promise<string[]> {
  if (files.length === 0) return [];

  // 1. Compression parallèle. Le canvas bloque un peu de CPU mais reste
  //    sous 200 ms par image sur un mobile moyen-gamme — ça reste un
  //    gros gain net face à l'upload d'un 5 Mo brut.
  const compressed = await Promise.all(files.map((f) => compressImage(f)));

  // 2. Mint des URLs signées en un seul round-trip.
  const mimes = compressed.map((f) => f.type);
  const urls = await requestSignedUrls(kind, mimes);
  if (urls.length !== compressed.length) {
    throw new Error("Réponse d'upload inattendue.");
  }

  const supabase = createSupabaseBrowserClient();
  const bucket = BUCKETS[kind];

  // 3. Upload parallèle. Compte un hit de progression par fichier terminé.
  let done = 0;
  const results = await Promise.all(
    compressed.map(async (file, i) => {
      const { path, token } = urls[i];
      const { error } = await supabase.storage
        .from(bucket)
        .uploadToSignedUrl(path, token, file, {
          contentType: file.type,
        });
      if (error) {
        throw new Error(`Échec de l'upload : ${error.message}`);
      }
      done += 1;
      onProgress?.(done, compressed.length);
      return urls[i].publicUrl;
    }),
  );

  return results;
}

/** Variante mono-fichier qui simplifie les call sites ImagePicker. */
export async function uploadFileDirect(
  kind: Exclude<UploadKind, "listing">,
  file: File,
): Promise<string> {
  const [url] = await uploadFilesDirect(kind, [file]);
  return url;
}
