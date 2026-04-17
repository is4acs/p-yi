"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma, DealStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/current-user";
import { createDealSchema } from "@/lib/validation/deal";
import { makeDealSlug } from "@/lib/deals/slug";
import { uploadDealImage } from "@/lib/storage/deal-images";

const KARMA_POST_DEAL = 5;

function redirectWithError(message: string): never {
  redirect(`/poster?error=${encodeURIComponent(message)}`);
}

export async function createDealAction(formData: FormData): Promise<void> {
  const user = await requireUser("/poster");

  const parsed = createDealSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? undefined,
    price: formData.get("price"),
    originalPrice: formData.get("originalPrice") ?? undefined,
    externalUrl: formData.get("externalUrl") ?? undefined,
    categorySlug: formData.get("categorySlug"),
    citySlug: formData.get("citySlug") ?? undefined,
    expiresAt: formData.get("expiresAt") ?? undefined,
  });

  if (!parsed.success) {
    redirectWithError(
      parsed.error.issues[0]?.message ?? "Formulaire invalide.",
    );
  }
  const data = parsed.data;

  const category = await prisma.category.findUnique({
    where: { slug: data.categorySlug },
    select: { id: true },
  });
  if (!category) redirectWithError("Catégorie invalide.");

  const city = data.citySlug
    ? await prisma.city.findUnique({
        where: { slug: data.citySlug },
        select: { id: true },
      })
    : null;

  const price = new Prisma.Decimal(data.price);
  const originalPrice = data.originalPrice
    ? new Prisma.Decimal(data.originalPrice)
    : null;
  const discountPercent =
    originalPrice && originalPrice.gt(price)
      ? Math.round(
          (1 - Number(price.toString()) / Number(originalPrice.toString())) *
            100,
        )
      : null;

  // Optional image upload
  let coverImageUrl: string | null = null;
  const file = formData.get("coverImage");
  if (file instanceof File && file.size > 0) {
    try {
      coverImageUrl = await uploadDealImage(file, user.id);
    } catch (err) {
      redirectWithError(
        err instanceof Error ? err.message : "Échec de l'upload.",
      );
    }
  }

  const slug = makeDealSlug(data.title);
  const expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;

  await prisma.deal.create({
    data: {
      slug,
      title: data.title,
      description: data.description ?? null,
      price,
      originalPrice,
      discountPercent,
      isFree: price.equals(0),
      externalUrl: data.externalUrl ?? null,
      coverImageUrl,
      status: DealStatus.PUBLISHED,
      publishedAt: new Date(),
      expiresAt,
      authorId: user.id,
      categoryId: category.id,
      cityId: city?.id ?? null,
      temperature: 0,
    },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { karma: { increment: KARMA_POST_DEAL } },
  });

  revalidatePath("/bons-plans");
  redirect(`/bons-plans/${slug}`);
}
