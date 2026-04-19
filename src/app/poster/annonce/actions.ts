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
import { requireActiveUser } from "@/lib/auth/current-user";
import { createListingSchema } from "@/lib/validation/listing";
import { makeListingSlug } from "@/lib/listings/slug";
import { maxPhotosForCategory } from "@/lib/listings/photo-limits";
import {
  type AttributeValue,
  coerceAttribute,
  denormalizeAttributes,
  getFieldsForCategory,
} from "@/lib/listings/field-registry";
import { removeListingImages } from "@/lib/storage/listing-images";
import {
  LISTING_BUCKET,
  parseOwnedStorageUrl,
} from "@/lib/storage/signed-upload";
import { writeLimiter } from "@/lib/rate-limit";
import { maybeQualifyReferee } from "@/lib/affiliate/qualify";

// Les petites annonces donnent un petit bonus de karma (3 pts) directement
// en DB, sans passer par l'historique KarmaHistory. L'historique + les
// badges sont réservés aux contributions "bons plans" qui sont la boucle
// principale de gamification Péyi.
const KARMA_POST_LISTING = 3;
const DEFAULT_EXPIRY_DAYS = 30;

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

/**
 * Extrait les attributs dynamiques (`attr.<name>`) depuis la FormData en
 * ne gardant que les clés déclarées par le registry de la catégorie. Ça
 * protège la DB contre l'injection de clés arbitraires depuis un client
 * modifié, et assure que la valeur persistée respecte le type annoncé.
 *
 * Jette une erreur lisible quand un champ `required` est vide — l'appelant
 * la remonte vers l'utilisateur via le flux `redirectWithError`.
 */
function extractAttributes(
  formData: FormData,
  categorySlug: string,
): Record<string, AttributeValue> {
  const fields = getFieldsForCategory(categorySlug);
  if (fields.length === 0) return {};

  const out: Record<string, AttributeValue> = {};
  for (const field of fields) {
    const raw = formData.get(`attr.${field.name}`);
    const value = coerceAttribute(field, raw);
    if (field.required) {
      const isMissing =
        value === null ||
        value === undefined ||
        (field.type === "boolean" && value !== true && value !== false);
      if (isMissing || (field.type !== "boolean" && value === null)) {
        throw new Error(`"${field.label}" est obligatoire.`);
      }
    }
    if (value !== null) out[field.name] = value;
  }
  return out;
}

/**
 * Lit la liste ordonnée d'URLs de photos depuis la FormData.
 * Les uploads eux-mêmes se font désormais directement navigateur →
 * Supabase (voir `src/lib/client/upload.ts`) ; le serveur ne reçoit que
 * les URLs publiques finales. On valide rigoureusement :
 *
 *   - format JSON + tableau de strings
 *   - longueur ≤ cap de photos de la catégorie
 *   - chaque URL pointe vers notre bucket `listings` ET vers le dossier
 *     du user courant (anti-cross-tenant via `parseOwnedStorageUrl`)
 *   - en mode édition, les URLs de l'ancienne galerie qui ne sont plus
 *     présentes sont retournées pour suppression best-effort
 */
function parsePhotoUrls({
  formData,
  userId,
  categorySlug,
  existingUrls,
}: {
  formData: FormData;
  userId: string;
  categorySlug: string;
  existingUrls: Set<string>;
}): { finalUrls: string[]; urlsToDelete: string[] } {
  const raw = formData.get("photoUrls");
  let urls: string[] = [];
  if (typeof raw === "string" && raw.trim().length > 0) {
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error("not-array");
      urls = parsed.filter((t): t is string => typeof t === "string");
    } catch {
      throw new Error("Photos : format invalide.");
    }
  }

  const max = maxPhotosForCategory(categorySlug);
  if (urls.length > max) {
    throw new Error(`Tu ne peux pas ajouter plus de ${max} photos.`);
  }

  // Dédup : l'ordre est donné par la première occurrence, les suivantes
  // sont ignorées (cas improbable mais protège contre un client buggué).
  const seen = new Set<string>();
  const finalUrls: string[] = [];
  for (const url of urls) {
    if (seen.has(url)) continue;
    // Chaque URL doit appartenir au bucket listings ET au dossier du user.
    // Les URLs existantes du listing respectent déjà cette règle (elles
    // ont été uploadées par lui-même), mais on re-valide par défense en
    // profondeur — si un jour on change l'origine Supabase ou le bucket,
    // ça fail loud au lieu de silencieusement accepter une URL obsolète.
    if (!parseOwnedStorageUrl(url, LISTING_BUCKET, userId)) {
      throw new Error("Une photo référencée est invalide.");
    }
    seen.add(url);
    finalUrls.push(url);
  }

  const urlsToDelete = Array.from(existingUrls).filter((u) => !seen.has(u));
  return { finalUrls, urlsToDelete };
}

export async function createListingAction(formData: FormData): Promise<void> {
  const user = await requireActiveUser("/poster/annonce");

  const { success, reset } = await writeLimiter.limit(
    `listing:create:${user.id}`,
  );
  if (!success) {
    redirectWithError("/poster/annonce", formatRateLimitMessage(reset));
  }

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

  // Préserve la catégorie dans l'URL d'erreur pour que le picker ne
  // reparte pas de zéro après une validation ratée — bien meilleur UX
  // que de rebalancer l'utilisateur au tout début du flux.
  const retryPath = `/poster/annonce?category=${encodeURIComponent(data.categorySlug)}`;

  let attributes: Record<string, AttributeValue> = {};
  try {
    attributes = extractAttributes(formData, data.categorySlug);
  } catch (err) {
    redirectWithError(
      retryPath,
      err instanceof Error ? err.message : "Détails invalides.",
    );
  }

  let finalUrls: string[] = [];
  try {
    const resolved = parsePhotoUrls({
      formData,
      userId: user.id,
      categorySlug: data.categorySlug,
      existingUrls: new Set(),
    });
    finalUrls = resolved.finalUrls;
  } catch (err) {
    redirectWithError(
      retryPath,
      err instanceof Error ? err.message : "Photos invalides.",
    );
  }

  const slug = makeListingSlug(data.title);
  const expiresAt = new Date(
    Date.now() + DEFAULT_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
  );

  const denorm = denormalizeAttributes(attributes);

  try {
    await prisma.$transaction(async (tx) => {
      const listing = await tx.listing.create({
        data: {
          slug,
          title: data.title,
          description: data.description,
          type: data.type as ListingType,
          priceType,
          price,
          condition: (data.condition as ItemCondition | undefined) ?? null,
          // First photo is always the cover. We keep `coverImageUrl`
          // populated for backward-compat with ListingCard / OG metadata
          // which already read it.
          coverImageUrl: finalUrls[0] ?? null,
          attributes: attributes as Prisma.InputJsonValue,
          // Colonnes indexées dérivées du JSON — re-synchronisées à chaque
          // update pour que les filtres / tris restent cohérents.
          ...denorm,
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

      if (finalUrls.length > 0) {
        await tx.listingImage.createMany({
          data: finalUrls.map((url, i) => ({
            listingId: listing.id,
            url,
            sortOrder: i,
          })),
        });
      }
    });
  } catch (err) {
    // DB failed after upload — clean up orphan photos.
    await removeListingImages(finalUrls);
    redirectWithError(
      "/poster/annonce",
      err instanceof Error ? err.message : "Impossible de créer l'annonce.",
    );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { karma: { increment: KARMA_POST_LISTING } },
  });

  // Fait avancer la qualification si l'auteur est filleul d'un parrain.
  // No-op sinon. Ne casse jamais la création de l'annonce.
  await maybeQualifyReferee(user.id);

  revalidatePath("/annonces");
  redirect(`/annonces/${slug}`);
}

export async function updateListingAction(formData: FormData): Promise<void> {
  const user = await requireActiveUser();

  const listingId = formData.get("listingId");
  if (typeof listingId !== "string" || !listingId) {
    redirectWithError("/annonces", "Annonce introuvable.");
  }

  const existing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: {
      id: true,
      slug: true,
      authorId: true,
      coverImageUrl: true,
      images: {
        orderBy: { sortOrder: "asc" },
        select: { url: true },
      },
    },
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

  let attributes: Record<string, AttributeValue> = {};
  try {
    attributes = extractAttributes(formData, data.categorySlug);
  } catch (err) {
    redirectWithError(
      editPath,
      err instanceof Error ? err.message : "Détails invalides.",
    );
  }

  // Union of URLs the listing might currently have : the gallery table
  // (new world) plus the legacy `coverImageUrl` field (for listings
  // created before Session 15). We accept any of these as "existing".
  const existingUrls = new Set<string>(existing.images.map((i) => i.url));
  if (existing.coverImageUrl) existingUrls.add(existing.coverImageUrl);

  let finalUrls: string[] = [];
  let urlsToDelete: string[] = [];
  try {
    const resolved = parsePhotoUrls({
      formData,
      userId: user.id,
      categorySlug: data.categorySlug,
      existingUrls,
    });
    finalUrls = resolved.finalUrls;
    urlsToDelete = resolved.urlsToDelete;
  } catch (err) {
    redirectWithError(
      editPath,
      err instanceof Error ? err.message : "Photos invalides.",
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Reset the gallery and rebuild it in the new order. Simpler and
      // safer than diffing — photos are cheap rows, the user always
      // submits the final order.
      await tx.listingImage.deleteMany({ where: { listingId: existing.id } });
      if (finalUrls.length > 0) {
        await tx.listingImage.createMany({
          data: finalUrls.map((url, i) => ({
            listingId: existing.id,
            url,
            sortOrder: i,
          })),
        });
      }

      await tx.listing.update({
        where: { id: existing.id },
        data: {
          title: data.title,
          description: data.description,
          type: data.type as ListingType,
          priceType,
          price,
          condition: (data.condition as ItemCondition | undefined) ?? null,
          coverImageUrl: finalUrls[0] ?? null,
          attributes: attributes as Prisma.InputJsonValue,
          // Resynchronise les colonnes indexées — si la catégorie change,
          // certaines clés disparaissent et on écrase bien en `null`.
          ...denormalizeAttributes(attributes),
          neighborhood: data.neighborhood ?? null,
          contactPhone: data.contactPhone ?? null,
          showPhone: data.showPhone === "on",
          allowMessages: data.allowMessages !== "off",
          categoryId: category.id,
          cityId: city.id,
        },
      });
    });
  } catch (err) {
    // DB failed — roll back the new uploads we just pushed.
    const newlyUploaded = finalUrls.filter((u) => !existingUrls.has(u));
    await removeListingImages(newlyUploaded);
    redirectWithError(
      editPath,
      err instanceof Error
        ? err.message
        : "Impossible de mettre à jour l'annonce.",
    );
  }

  // Drop orphan blobs from storage. Best-effort — a failure here leaves
  // a few unreferenced files but doesn't affect the user.
  if (urlsToDelete.length > 0) {
    await removeListingImages(urlsToDelete);
  }

  revalidatePath("/annonces");
  revalidatePath(`/annonces/${existing.slug}`);
  redirect(`/annonces/${existing.slug}`);
}

export async function deleteListingAction(formData: FormData): Promise<void> {
  const user = await requireActiveUser();

  const listingId = formData.get("listingId");
  if (typeof listingId !== "string" || !listingId) {
    redirectWithError("/annonces", "Annonce introuvable.");
  }

  const existing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: {
      id: true,
      slug: true,
      authorId: true,
      coverImageUrl: true,
      images: { select: { url: true } },
    },
  });
  if (!existing) redirectWithError("/annonces", "Annonce introuvable.");
  if (existing.authorId !== user.id) {
    redirectWithError("/annonces", "Tu ne peux supprimer que tes annonces.");
  }

  await prisma.listing.delete({ where: { id: existing.id } });

  // Fire-and-forget cleanup of every photo in storage.
  const urls = new Set<string>(existing.images.map((i) => i.url));
  if (existing.coverImageUrl) urls.add(existing.coverImageUrl);
  await removeListingImages(Array.from(urls));

  revalidatePath("/annonces");
  redirect("/annonces");
}

export async function bumpListingAction(formData: FormData): Promise<void> {
  const user = await requireActiveUser();

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
