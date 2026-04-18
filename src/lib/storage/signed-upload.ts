import "server-only";

import { randomBytes } from "node:crypto";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

export const DEAL_BUCKET = "deals";
export const LISTING_BUCKET = "listings";
export const AVATAR_BUCKET = "avatars";

export const ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export type AllowedMime = (typeof ALLOWED_MIME)[number];

export function isAllowedMime(mime: string): mime is AllowedMime {
  return (ALLOWED_MIME as readonly string[]).includes(mime);
}

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

function objectPath(userId: string, mime: AllowedMime): string {
  return `${userId}/${Date.now()}-${randomBytes(4).toString("hex")}.${extFor(mime)}`;
}

export type SignedUpload = {
  /** Chemin dans le bucket, utilisé pour `uploadToSignedUrl` côté client. */
  path: string;
  /** Token à passer à `uploadToSignedUrl`. */
  token: string;
  /** URL publique finale — ce que le serveur persistera en DB. */
  publicUrl: string;
};

/**
 * Crée une URL d'upload signée pour que le navigateur pousse directement le
 * fichier vers Supabase Storage, sans passer par Vercel (qui coupe à 60 s sur
 * Hobby, et facture la bande passante sortie). On utilise la service role
 * key car `createSignedUploadUrl` requiert le scope storage.admin, mais :
 *
 *   - le path est construit serveur-side avec l'UID vérifié → l'utilisateur
 *     ne peut écrire que dans `<bucket>/<son-uid>/…`
 *   - l'URL signée expire côté Supabase (~2 h) et ne permet qu'un unique
 *     upload sur ce path précis
 *
 * Le tuple retourné contient aussi la `publicUrl` finale pour que le client
 * la remonte au submit du formulaire et que le serveur la valide via
 * `parseOwnedStorageUrl` avant de l'écrire en DB.
 */
async function signOne(
  bucket: string,
  userId: string,
  mime: AllowedMime,
): Promise<SignedUpload> {
  const supabase = createSupabaseAdminClient();
  const path = objectPath(userId, mime);

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUploadUrl(path);

  if (error || !data) {
    throw new Error(
      `Impossible de préparer l'upload (${bucket}) : ${error?.message ?? "inconnue"}`,
    );
  }

  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);

  return {
    path: data.path,
    token: data.token,
    publicUrl: pub.publicUrl,
  };
}

export async function signDealUpload(
  userId: string,
  mime: AllowedMime,
): Promise<SignedUpload> {
  return signOne(DEAL_BUCKET, userId, mime);
}

export async function signListingUploads(
  userId: string,
  mimes: AllowedMime[],
): Promise<SignedUpload[]> {
  // Parallèle : chaque `createSignedUploadUrl` est indépendant côté Supabase.
  // On reste borné par le cap de photos par catégorie côté appelant.
  return Promise.all(mimes.map((m) => signOne(LISTING_BUCKET, userId, m)));
}

export async function signAvatarUpload(
  userId: string,
  mime: AllowedMime,
): Promise<SignedUpload> {
  return signOne(AVATAR_BUCKET, userId, mime);
}

/**
 * Valide qu'une URL publique vient bien d'un bucket que l'on gère, qu'elle
 * est dans le dossier du bon `userId`, et renvoie le chemin interne si OK.
 * Retourne `null` sinon — l'appelant rejette la requête.
 *
 * Ça ferme la boucle de sécurité : un client malveillant qui tenterait de
 * soumettre l'URL d'une image appartenant à un autre utilisateur (ou à un
 * bucket inconnu) voit sa requête rejetée par le server action.
 */
export function parseOwnedStorageUrl(
  url: string,
  bucket: string,
  userId: string,
): { path: string } | null {
  if (typeof url !== "string" || url.length === 0) return null;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  // L'origine doit matcher exactement notre projet Supabase.
  const expectedOrigin = new URL(env.NEXT_PUBLIC_SUPABASE_URL).origin;
  if (parsed.origin !== expectedOrigin) return null;

  // Format attendu : /storage/v1/object/public/<bucket>/<uid>/<file>
  const prefix = `/storage/v1/object/public/${bucket}/`;
  if (!parsed.pathname.startsWith(prefix)) return null;

  const inner = parsed.pathname.slice(prefix.length);
  const firstSlash = inner.indexOf("/");
  if (firstSlash <= 0) return null;

  const owner = inner.slice(0, firstSlash);
  if (owner !== userId) return null;

  return { path: inner };
}
