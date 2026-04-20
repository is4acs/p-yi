"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { AdminActionType, AdminTargetType, UserRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/current-user";
import { logAdminAction } from "@/lib/admin/log";
import { removeListingImages } from "@/lib/storage/listing-images";

/**
 * Supprime une annonce en tant qu'admin. Hard delete — les annonces
 * n'ont pas (encore) de flag `deletedAt` pour soft-delete (S22).
 *
 * Accessible à partir de MODERATOR (tout le monde dans l'équipe de
 * modération peut retirer une annonce problématique signalée).
 *
 * Logge dans `AdminActionLog` avec le slug et le titre pour qu'on
 * puisse retrouver trace même après la suppression DB.
 */
export async function adminDeleteListingAction(formData: FormData) {
  const admin = await requireRole(UserRole.MODERATOR, "/admin/annonces");

  const listingId = String(formData.get("listingId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim() || null;

  if (!listingId) {
    redirect("/admin/annonces?error=" + encodeURIComponent("Annonce introuvable."));
  }

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: {
      id: true,
      slug: true,
      title: true,
      authorId: true,
      images: { select: { url: true } },
    },
  });
  if (!listing) {
    redirect("/admin/annonces?error=" + encodeURIComponent("Annonce introuvable."));
  }

  const imageUrls = listing.images.map((i) => i.url);

  await prisma.listing.delete({ where: { id: listing.id } });

  // Best-effort cleanup Storage — si ça échoue on laisse les objets
  // orphelins (un cron de cleanup Supabase peut les ramasser plus tard).
  if (imageUrls.length > 0) {
    removeListingImages(imageUrls).catch((err) => {
      console.error("[adminDeleteListing] storage cleanup failed", err);
    });
  }

  await logAdminAction({
    adminId: admin.id,
    action: AdminActionType.DELETE_LISTING,
    targetType: AdminTargetType.LISTING,
    targetId: listing.id,
    reason,
    metadata: {
      slug: listing.slug,
      title: listing.title,
      authorId: listing.authorId,
    },
  });

  revalidatePath("/admin/annonces");
  revalidatePath("/annonces");
  revalidateTag(`listing:${listing.slug}`);
  redirect("/admin/annonces?success=" + encodeURIComponent("Annonce supprimée."));
}
