"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/current-user";

export type FavoriteResult = {
  ok: boolean;
  error?: string;
  favorited?: boolean;
};

/**
 * Toggle a deal in the user's favorites. Returns the new state so the
 * client can reconcile its optimistic update with the server truth.
 */
export async function toggleFavoriteAction(
  dealId: string,
): Promise<FavoriteResult> {
  if (typeof dealId !== "string" || !dealId) {
    return { ok: false, error: "Bon plan invalide." };
  }

  const user = await requireUser();

  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    select: { id: true, slug: true },
  });
  if (!deal) return { ok: false, error: "Bon plan introuvable." };

  const existing = await prisma.favorite.findUnique({
    where: { userId_dealId: { userId: user.id, dealId: deal.id } },
    select: { id: true },
  });

  let favorited: boolean;
  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
    favorited = false;
  } else {
    await prisma.favorite.create({
      data: { userId: user.id, dealId: deal.id },
    });
    favorited = true;
  }

  revalidatePath("/profil/favoris");
  revalidatePath(`/bons-plans/${deal.slug}`);

  return { ok: true, favorited };
}
