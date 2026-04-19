import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/auth/current-user";
import { getClientIp, writeLimiter } from "@/lib/rate-limit";
import { logger } from "@/lib/log";

/**
 * Enregistre un PushSubscription côté serveur.
 *
 * Contract côté client : après `pushManager.subscribe(...)`, on POST
 * ici `subscription.toJSON()` qui contient `{endpoint, keys:{p256dh, auth}}`.
 * On l'upserte par endpoint (unique) — ré-inscription du même device
 * met à jour les clés sans créer de doublon.
 *
 * Sécurité : require user connecté + rate-limit (writeLimiter, 10/min/user).
 * On ne stocke pas l'IP en DB (RGPD — pas justifié pour cette fonctionnalité).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  endpoint: z.string().url().max(2048),
  keys: z.object({
    p256dh: z.string().min(1).max(256),
    auth: z.string().min(1).max(256),
  }),
});

export async function POST(req: Request) {
  const user = await requireActiveUser();

  const ip = await getClientIp();
  const { success } = await writeLimiter.limit(`push-sub:${ip}`);
  if (!success) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const { endpoint, keys } = parsed.data;
  const userAgent = req.headers.get("user-agent")?.slice(0, 500) ?? null;

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: {
      userId: user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      userAgent,
    },
    update: {
      userId: user.id,
      p256dh: keys.p256dh,
      auth: keys.auth,
      userAgent,
      lastSeenAt: new Date(),
    },
  });

  logger.info("push.subscribed", { userId: user.id });
  return NextResponse.json({ ok: true });
}
