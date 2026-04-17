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
 * Toggle a listing in the user's favorites. Returns the new state so the
 * client can reconcile its optimistic update with the server truth.
 */
export async function toggleListingFavoriteAction(
  listingId: string,
): Promise<FavoriteResult> {
  if (typeof listingId !== "string" || !listingId) {
    return { ok: false, error: "Annonce invalide." };
  }

  const user = await requireUser();

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { id: true, slug: true },
  });
  if (!listing) return { ok: false, error: "Annonce introuvable." };

  const existing = await prisma.favorite.findUnique({
    where: { userId_listingId: { userId: user.id, listingId: listing.id } },
    select: { id: true },
  });

  let favorited: boolean;
  if (existing) {
    await prisma.$transaction([
      prisma.favorite.delete({ where: { id: existing.id } }),
      prisma.listing.update({
        where: { id: listing.id },
        data: { favoriteCount: { decrement: 1 } },
      }),
    ]);
    favorited = false;
  } else {
    await prisma.$transaction([
      prisma.favorite.create({
        data: { userId: user.id, listingId: listing.id },
      }),
      prisma.listing.update({
        where: { id: listing.id },
        data: { favoriteCount: { increment: 1 } },
      }),
    ]);
    favorited = true;
  }

  revalidatePath("/profil/favoris");
  revalidatePath(`/annonces/${listing.slug}`);

  return { ok: true, favorited };
}
