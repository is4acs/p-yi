"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma, DealStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/current-user";
import { createDealSchema } from "@/lib/validation/deal";
import { makeDealSlug } from "@/lib/deals/slug";
import { removeDealImage, uploadDealImage } from "@/lib/storage/deal-images";
import { writeLimiter } from "@/lib/rate-limit";

const KARMA_POST_DEAL = 5;

function redirectWithError(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function formatRateLimitMessage(reset: number): string {
  const secondsLeft = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
  if (secondsLeft >= 60) {
    return `Trop de publications en peu de temps. Réessaye dans ${Math.ceil(secondsLeft / 60)} min.`;
  }
  return `Trop de publications en peu de temps. Réessaye dans ${secondsLeft}s.`;
}

function parseDealForm(formData: FormData) {
  return createDealSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? undefined,
    price: formData.get("price"),
    originalPrice: formData.get("originalPrice") ?? undefined,
    externalUrl: formData.get("externalUrl") ?? undefined,
    categorySlug: formData.get("categorySlug"),
    citySlug: formData.get("citySlug") ?? undefined,
    expiresAt: formData.get("expiresAt") ?? undefined,
  });
}

function computeDiscount(
  price: Prisma.Decimal,
  originalPrice: Prisma.Decimal | null,
): number | null {
  if (!originalPrice || !originalPrice.gt(price)) return null;
  return Math.round(
    (1 - Number(price.toString()) / Number(originalPrice.toString())) * 100,
  );
}

export async function createDealAction(formData: FormData): Promise<void> {
  const user = await requireUser("/poster");

  // Rate limit par userId — 10 créations/min = largement suffisant pour un
  // humain, bloque un bot qui tenterait de spammer.
  const { success, reset } = await writeLimiter.limit(`deal:create:${user.id}`);
  if (!success) {
    redirectWithError("/poster", formatRateLimitMessage(reset));
  }

  const parsed = parseDealForm(formData);
  if (!parsed.success) {
    redirectWithError(
      "/poster",
      parsed.error.issues[0]?.message ?? "Formulaire invalide.",
    );
  }
  const data = parsed.data;

  const category = await prisma.category.findUnique({
    where: { slug: data.categorySlug },
    select: { id: true },
  });
  if (!category) redirectWithError("/poster", "Catégorie invalide.");

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
  const discountPercent = computeDiscount(price, originalPrice);

  let coverImageUrl: string | null = null;
  const file = formData.get("coverImage");
  if (file instanceof File && file.size > 0) {
    try {
      coverImageUrl = await uploadDealImage(file, user.id);
    } catch (err) {
      redirectWithError(
        "/poster",
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

export async function updateDealAction(formData: FormData): Promise<void> {
  const user = await requireUser();

  const dealId = formData.get("dealId");
  if (typeof dealId !== "string" || !dealId) {
    redirectWithError("/bons-plans", "Bon plan introuvable.");
  }

  const existing = await prisma.deal.findUnique({
    where: { id: dealId },
    select: {
      id: true,
      slug: true,
      authorId: true,
      coverImageUrl: true,
    },
  });
  if (!existing) redirectWithError("/bons-plans", "Bon plan introuvable.");
  if (existing.authorId !== user.id) {
    redirectWithError("/bons-plans", "Tu ne peux modifier que tes bons plans.");
  }

  const editPath = `/bons-plans/${existing.slug}/edit`;
  const parsed = parseDealForm(formData);
  if (!parsed.success) {
    redirectWithError(
      editPath,
      parsed.error.issues[0]?.message ?? "Formulaire invalide.",
    );
  }
  const data = parsed.data;

  const category = await prisma.category.findUnique({
    where: { slug: data.categorySlug },
    select: { id: true },
  });
  if (!category) redirectWithError(editPath, "Catégorie invalide.");

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
  const discountPercent = computeDiscount(price, originalPrice);

  let coverImageUrl: string | null = existing.coverImageUrl;
  const file = formData.get("coverImage");
  if (file instanceof File && file.size > 0) {
    try {
      const newUrl = await uploadDealImage(file, user.id);
      if (existing.coverImageUrl) {
        await removeDealImage(existing.coverImageUrl);
      }
      coverImageUrl = newUrl;
    } catch (err) {
      redirectWithError(
        editPath,
        err instanceof Error ? err.message : "Échec de l'upload.",
      );
    }
  }

  const expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;

  await prisma.deal.update({
    where: { id: existing.id },
    data: {
      title: data.title,
      description: data.description ?? null,
      price,
      originalPrice,
      discountPercent,
      isFree: price.equals(0),
      externalUrl: data.externalUrl ?? null,
      coverImageUrl,
      expiresAt,
      categoryId: category.id,
      cityId: city?.id ?? null,
    },
  });

  revalidatePath("/bons-plans");
  revalidatePath(`/bons-plans/${existing.slug}`);
  redirect(`/bons-plans/${existing.slug}`);
}

export async function deleteDealAction(formData: FormData): Promise<void> {
  const user = await requireUser();

  const dealId = formData.get("dealId");
  if (typeof dealId !== "string" || !dealId) {
    redirectWithError("/bons-plans", "Bon plan introuvable.");
  }

  const existing = await prisma.deal.findUnique({
    where: { id: dealId },
    select: { id: true, slug: true, authorId: true, coverImageUrl: true },
  });
  if (!existing) redirectWithError("/bons-plans", "Bon plan introuvable.");
  if (existing.authorId !== user.id) {
    redirectWithError("/bons-plans", "Tu ne peux supprimer que tes bons plans.");
  }

  await prisma.deal.delete({ where: { id: existing.id } });
  if (existing.coverImageUrl) {
    await removeDealImage(existing.coverImageUrl);
  }

  revalidatePath("/bons-plans");
  redirect("/bons-plans");
}
