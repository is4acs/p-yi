"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { AdminActionType, AdminTargetType, UserRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/current-user";
import { logAdminAction } from "@/lib/admin/log";
import { removeDealImage } from "@/lib/storage/deal-images";

export async function adminDeleteDealAction(formData: FormData) {
  const admin = await requireRole(UserRole.MODERATOR, "/admin/bons-plans");

  const dealId = String(formData.get("dealId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim() || null;

  if (!dealId) {
    redirect("/admin/bons-plans?error=" + encodeURIComponent("Bon plan introuvable."));
  }

  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    select: {
      id: true,
      slug: true,
      title: true,
      authorId: true,
      coverImageUrl: true,
    },
  });
  if (!deal) {
    redirect("/admin/bons-plans?error=" + encodeURIComponent("Bon plan introuvable."));
  }

  await prisma.deal.delete({ where: { id: deal.id } });

  if (deal.coverImageUrl) {
    removeDealImage(deal.coverImageUrl).catch((err) => {
      console.error("[adminDeleteDeal] storage cleanup failed", err);
    });
  }

  await logAdminAction({
    adminId: admin.id,
    action: AdminActionType.DELETE_DEAL,
    targetType: AdminTargetType.DEAL,
    targetId: deal.id,
    reason,
    metadata: { slug: deal.slug, title: deal.title, authorId: deal.authorId },
  });

  revalidatePath("/admin/bons-plans");
  revalidatePath("/bons-plans");
  revalidateTag(`deal:${deal.slug}`);
  redirect("/admin/bons-plans?success=" + encodeURIComponent("Bon plan supprimé."));
}
