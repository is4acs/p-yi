import { NextResponse } from "next/server";

import { getPublicVapidKey, isPushConfigured } from "@/lib/notifications/push";

/**
 * Expose la clé publique VAPID au client pour `pushManager.subscribe`.
 * On ne passe PAS par `NEXT_PUBLIC_VAPID_PUBLIC_KEY` injectée dans le
 * bundle pour deux raisons :
 *  1. Permet de rotater la clé sans rebuild.
 *  2. Signale à 200/404 si les push sont configurés côté serveur —
 *     le client peut adapter l'UI (cacher le bouton "Activer").
 *
 * Endpoint public (pas d'auth) — la clé est publique par design.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!isPushConfigured()) {
    return NextResponse.json(
      { error: "push_not_configured" },
      { status: 404 },
    );
  }
  return NextResponse.json({ publicKey: getPublicVapidKey() });
}
