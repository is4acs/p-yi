import { NextResponse } from "next/server";
import { z } from "zod";

import { requireActiveUser } from "@/lib/auth/current-user";
import { writeLimiter } from "@/lib/rate-limit";
import {
  ALLOWED_MIME,
  signDealUpload,
  signListingUploads,
  signAvatarUpload,
  type AllowedMime,
  type SignedUpload,
} from "@/lib/storage/signed-upload";

/**
 * Mint d'URLs d'upload signées. Contrat :
 *
 *   POST /api/upload/sign
 *   {
 *     "kind": "deal" | "listing" | "avatar",
 *     "mimes": ["image/jpeg", "image/webp", ...]   // 1 pour deal/avatar
 *   }
 *
 *   → 200 { "urls": [{ "path", "token", "publicUrl" }, ...] }
 *
 * Ce qui rend le design sûr :
 *   - Auth obligatoire (`requireActiveUser`) → ban + non-connecté KO.
 *   - Rate limit par `userId` (partagé avec `writeLimiter`, 10/min) pour
 *     empêcher qu'un bot vole des URLs en masse.
 *   - Le path est assemblé serveur-side avec l'UID → impossible de viser
 *     le dossier d'un autre utilisateur.
 *   - MIME validé contre la whitelist JPEG/PNG/WebP.
 *   - Cap dur sur `mimes.length` pour "listing" (20 = marge au-dessus du cap
 *     produit de 15 photos par catégorie étendue).
 *   - Le bucket `avatars` ne fait qu'une URL à la fois, le bucket `deals` idem.
 */

export const runtime = "nodejs";

const MAX_LISTING_BATCH = 20;

const schema = z.object({
  kind: z.enum(["deal", "listing", "avatar"]),
  mimes: z
    .array(z.enum(ALLOWED_MIME))
    .min(1, "Au moins un fichier.")
    .max(MAX_LISTING_BATCH, `Maximum ${MAX_LISTING_BATCH} fichiers à la fois.`),
});

export async function POST(req: Request) {
  const user = await requireActiveUser();

  const { success } = await writeLimiter.limit(`upload:sign:${user.id}`);
  if (!success) {
    return NextResponse.json(
      { error: "Trop d'uploads en peu de temps. Réessaye dans un instant." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Payload invalide." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Payload invalide." },
      { status: 400 },
    );
  }

  const { kind, mimes } = parsed.data;

  try {
    let urls: SignedUpload[];
    if (kind === "listing") {
      urls = await signListingUploads(user.id, mimes as AllowedMime[]);
    } else if (kind === "deal") {
      if (mimes.length !== 1) {
        return NextResponse.json(
          { error: "Un bon plan ne peut avoir qu'une seule image de couverture." },
          { status: 400 },
        );
      }
      urls = [await signDealUpload(user.id, mimes[0] as AllowedMime)];
    } else {
      // avatar
      if (mimes.length !== 1) {
        return NextResponse.json(
          { error: "Un seul avatar à la fois." },
          { status: 400 },
        );
      }
      urls = [await signAvatarUpload(user.id, mimes[0] as AllowedMime)];
    }

    return NextResponse.json({ urls });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Échec de la préparation de l'upload.",
      },
      { status: 500 },
    );
  }
}
