"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { NotificationType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/auth/current-user";
import { dispatchNotification } from "@/lib/notifications/dispatch";

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

  const user = await requireActiveUser();

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { id: true, slug: true, title: true, authorId: true },
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

    // Notifie le vendeur — signal utile : quelqu'un s'intéresse à son
    // annonce sans forcément encore envoyer de message. On passe via
    // dispatchNotification pour respecter les prefs email/push. Pas
    // de notif si le user se favorite lui-même (cas rare mais bon).
    if (listing.authorId !== user.id) {
      await dispatchNotification({
        userId: listing.authorId,
        type: NotificationType.LISTING_FAVORITED,
        title: `@${user.username} a liké ton annonce`,
        message: `« ${listing.title.slice(0, 80)}${
          listing.title.length > 80 ? "…" : ""
        } » vient d'être ajoutée aux favoris.`,
        actionPath: `/annonces/${listing.slug}`,
        listingId: listing.id,
        fromUserId: user.id,
        // Un seul push par listing — évite les séries si 10 personnes
        // favorite dans la même minute.
        pushTag: `listing-fav:${listing.id}`,
      });
    }
  }

  revalidatePath("/profil/favoris");
  revalidatePath(`/annonces/${listing.slug}`);
  revalidateTag(`listing:${listing.slug}`);

  return { ok: true, favorited };
}
