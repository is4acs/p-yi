"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  Prisma,
  ListingStatus,
  ListingType,
  PriceType,
  ItemCondition,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/current-user";
import { createListingSchema } from "@/lib/validation/listing";
import { makeListingSlug } from "@/lib/listings/slug";
import {
  removeListingImage,
  uploadListingImage,
} from "@/lib/storage/listing-images";

const KARMA_POST_LISTING = 3;
const DEFAULT_EXPIRY_DAYS = 30;

function redirectWithError(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function parseListingForm(formData: FormData) {
  return createListingSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    type: formData.get("type"),
    priceType: formData.get("priceType"),
    price: formData.get("price") ?? undefined,
    condition: formData.get("condition") ?? undefined,
    categorySlug: formData.get("categorySlug"),
    citySlug: formData.get("citySlug"),
    neighborhood: formData.get("neighborhood") ?? undefined,
    contactPhone: formData.get("contactPhone") ?? undefined,
    showPhone: formData.get("showPhone") ?? undefined,
    allowMessages: formData.get("allowMessages") ?? undefined,
  });
}

function needsPrice(priceType: PriceType): boolean {
  return (
    priceType === "FIXED" ||
    priceType === "NEGOTIABLE" ||
    priceType === "PER_MONTH" ||
    priceType === "PER_DAY"
  );
}

export async function createListingAction(formData: FormData): Promise<void> {
  const user = await requireUser("/poster/annonce");

  const parsed = parseListingForm(formData);
  if (!parsed.success) {
    redirectWithError(
      "/poster/annonce",
      parsed.error.issues[0]?.message ?? "Formulaire invalide.",
    );
  }
  const data = parsed.data;

  const [category, city] = await Promise.all([
    prisma.category.findUnique({
      where: { slug: data.categorySlug },
      select: { id: true },
    }),
    prisma.city.findUnique({
      where: { slug: data.citySlug },
      select: { id: true },
    }),
  ]);
  if (!category) redirectWithError("/poster/annonce", "Catégorie invalide.");
  if (!city) redirectWithError("/poster/annonce", "Commune invalide.");

  const priceType = data.priceType as PriceType;
  const price =
    data.price && needsPrice(priceType) ? new Prisma.Decimal(data.price) : null;

  let coverImageUrl: string | null = null;
  const file = formData.get("coverImage");
  if (file instanceof File && file.size > 0) {
    try {
      coverImageUrl = await uploadListingImage(file, user.id);
    } catch (err) {
      redirectWithError(
        "/poster/annonce",
        err instanceof Error ? err.message : "Échec de l'upload.",
      );
    }
  }

  const slug = makeListingSlug(data.title);
  const expiresAt = new Date(
    Date.now() + DEFAULT_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
  );

  await prisma.listing.create({
    data: {
      slug,
      title: data.title,
      description: data.description,
      type: data.type as ListingType,
      priceType,
      price,
      condition: (data.condition as ItemCondition | undefined) ?? null,
      coverImageUrl,
      neighborhood: data.neighborhood ?? null,
      contactPhone: data.contactPhone ?? null,
      showPhone: data.showPhone === "on",
      allowMessages: data.allowMessages !== "off",
      status: ListingStatus.PUBLISHED,
      publishedAt: new Date(),
      expiresAt,
      authorId: user.id,
      categoryId: category.id,
      cityId: city.id,
    },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { karma: { increment: KARMA_POST_LISTING } },
  });

  revalidatePath("/annonces");
  redirect(`/annonces/${slug}`);
}

export async function updateListingAction(formData: FormData): Promise<void> {
  const user = await requireUser();

  const listingId = formData.get("listingId");
  if (typeof listingId !== "string" || !listingId) {
    redirectWithError("/annonces", "Annonce introuvable.");
  }

  const existing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { id: true, slug: true, authorId: true, coverImageUrl: true },
  });
  if (!existing) redirectWithError("/annonces", "Annonce introuvable.");
  if (existing.authorId !== user.id) {
    redirectWithError("/annonces", "Tu ne peux modifier que tes annonces.");
  }

  const editPath = `/annonces/${existing.slug}/edit`;
  const parsed = parseListingForm(formData);
  if (!parsed.success) {
    redirectWithError(
      editPath,
      parsed.error.issues[0]?.message ?? "Formulaire invalide.",
    );
  }
  const data = parsed.data;

  const [category, city] = await Promise.all([
    prisma.category.findUnique({
      where: { slug: data.categorySlug },
      select: { id: true },
    }),
    prisma.city.findUnique({
      where: { slug: data.citySlug },
      select: { id: true },
    }),
  ]);
  if (!category) redirectWithError(editPath, "Catégorie invalide.");
  if (!city) redirectWithError(editPath, "Commune invalide.");

  const priceType = data.priceType as PriceType;
  const price =
    data.price && needsPrice(priceType) ? new Prisma.Decimal(data.price) : null;

  let coverImageUrl: string | null = existing.coverImageUrl;
  const file = formData.get("coverImage");
  if (file instanceof File && file.size > 0) {
    try {
      const newUrl = await uploadListingImage(file, user.id);
      if (existing.coverImageUrl) {
        await removeListingImage(existing.coverImageUrl);
      }
      coverImageUrl = newUrl;
    } catch (err) {
      redirectWithError(
        editPath,
        err instanceof Error ? err.message : "Échec de l'upload.",
      );
    }
  }

  await prisma.listing.update({
    where: { id: existing.id },
    data: {
      title: data.title,
      description: data.description,
      type: data.type as ListingType,
      priceType,
      price,
      condition: (data.condition as ItemCondition | undefined) ?? null,
      coverImageUrl,
      neighborhood: data.neighborhood ?? null,
      contactPhone: data.contactPhone ?? null,
      showPhone: data.showPhone === "on",
      allowMessages: data.allowMessages !== "off",
      categoryId: category.id,
      cityId: city.id,
    },
  });

  revalidatePath("/annonces");
  revalidatePath(`/annonces/${existing.slug}`);
  redirect(`/annonces/${existing.slug}`);
}

export async function deleteListingAction(formData: FormData): Promise<void> {
  const user = await requireUser();

  const listingId = formData.get("listingId");
  if (typeof listingId !== "string" || !listingId) {
    redirectWithError("/annonces", "Annonce introuvable.");
  }

  const existing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { id: true, slug: true, authorId: true, coverImageUrl: true },
  });
  if (!existing) redirectWithError("/annonces", "Annonce introuvable.");
  if (existing.authorId !== user.id) {
    redirectWithError("/annonces", "Tu ne peux supprimer que tes annonces.");
  }

  await prisma.listing.delete({ where: { id: existing.id } });
  if (existing.coverImageUrl) {
    await removeListingImage(existing.coverImageUrl);
  }

  revalidatePath("/annonces");
  redirect("/annonces");
}

export async function bumpListingAction(formData: FormData): Promise<void> {
  const user = await requireUser();

  const listingId = formData.get("listingId");
  if (typeof listingId !== "string" || !listingId) {
    redirectWithError("/annonces", "Annonce introuvable.");
  }

  const existing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { id: true, slug: true, authorId: true },
  });
  if (!existing) redirectWithError("/annonces", "Annonce introuvable.");
  if (existing.authorId !== user.id) {
    redirectWithError("/annonces", "Tu ne peux remonter que tes annonces.");
  }

  await prisma.listing.update({
    where: { id: existing.id },
    data: { bumpedAt: new Date() },
  });

  revalidatePath("/annonces");
  revalidatePath(`/annonces/${existing.slug}`);
  redirect(`/annonces/${existing.slug}`);
}
