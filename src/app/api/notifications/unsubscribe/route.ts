import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/auth/current-user";

/**
 * Supprime un PushSubscription côté serveur. Déclenché par le client
 * quand l'utilisateur désactive les notifications depuis /profil/edit
 * ou quand le navigateur révoque automatiquement l'abonnement.
 *
 * On double-vérifie que l'endpoint appartient bien au user connecté
 * (defense-in-depth : même si quelqu'un connaît l'endpoint d'un tiers
 * il ne peut pas le dégager). Prisma renvoie un 0 côté deleteMany si
 * pas de match — on traite ça comme un succès (idempotent).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  endpoint: z.string().url().max(2048),
});

export async function POST(req: Request) {
  const user = await requireActiveUser();

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  await prisma.pushSubscription.deleteMany({
    where: { endpoint: parsed.data.endpoint, userId: user.id },
  });

  return NextResponse.json({ ok: true });
}
