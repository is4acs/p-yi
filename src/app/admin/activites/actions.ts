"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  ActivityStatus,
  AdminActionType,
  AdminTargetType,
  Prisma,
  UserRole,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/current-user";
import { logAdminAction } from "@/lib/admin/log";
import { makeActivitySlugBase } from "@/lib/activities/slug";
import { removeActivityImages } from "@/lib/storage/activity-images";
import {
  ACTIVITY_BUCKET,
  parseStorageUrlInBucket,
} from "@/lib/storage/signed-upload";
import {
  activityFormSchema,
  buildOpeningHoursJson,
  eurosToCents,
} from "@/lib/validation/activity";

/**
 * Server actions du back-office activités. Rôle ADMIN requis partout
 * (le layout /admin ne garde qu'à MODERATOR), audit systématique via
 * AdminActionLog, revalidation des pages publiques touchées.
 */

const LIST_PATH = "/admin/activites";

function failTo(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function revalidatePublicActivityPages(slug: string): void {
  revalidatePath("/activites");
  revalidatePath("/activites/guyane");
  revalidatePath(`/activites/${slug}`);
  revalidatePath(LIST_PATH);
}

async function ensureUniqueSlug(name: string): Promise<string> {
  const base = makeActivitySlugBase(name);
  let candidate = base;
  for (let i = 2; i <= 30; i += 1) {
    const existing = await prisma.activity.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
    candidate = `${base}-${i}`;
  }
  throw new Error(`Impossible de générer un slug unique pour « ${name} »`);
}

export async function adminSaveActivityAction(formData: FormData) {
  const admin = await requireRole(UserRole.ADMIN, LIST_PATH);

  const str = (key: string) => String(formData.get(key) ?? "");
  const idRaw = str("id").trim();
  const formPath = idRaw ? `${LIST_PATH}/${idRaw}` : `${LIST_PATH}/nouveau`;

  const parsed = activityFormSchema.safeParse({
    id: idRaw,
    name: str("name"),
    tagline: str("tagline"),
    description: str("description"),
    category: str("category"),
    citySlug: str("citySlug"),
    tags: str("tags"),
    address: str("address"),
    startPoint: str("startPoint"),
    latitude: str("latitude"),
    longitude: str("longitude"),
    accessModes: formData.getAll("accessModes").map(String),
    durationMinutes: str("durationMinutes"),
    difficulty: str("difficulty"),
    seasons: formData.getAll("seasons").map(String),
    accessNote: str("accessNote"),
    priceMin: str("priceMin"),
    priceMax: str("priceMax"),
    isFree: formData.get("isFree") === "on",
    bookingRequired: formData.get("bookingRequired") === "on",
    bookingUrl: str("bookingUrl"),
    phone: str("phone"),
    whatsapp: str("whatsapp"),
    website: str("website"),
    instagram: str("instagram"),
    isFeatured: formData.get("isFeatured") === "on",
    hours: {
      monday: str("hours_monday"),
      tuesday: str("hours_tuesday"),
      wednesday: str("hours_wednesday"),
      thursday: str("hours_thursday"),
      friday: str("hours_friday"),
      saturday: str("hours_saturday"),
      sunday: str("hours_sunday"),
    },
    hoursExceptions: str("hours_exceptions"),
    images: str("images"),
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    failTo(formPath, first?.message ?? "Formulaire invalide.");
  }
  const values = parsed.data;

  // Les URLs d'images doivent venir de NOTRE bucket activités — un admin
  // ne peut pas faire persister une URL arbitraire en DB.
  for (const image of values.images) {
    if (!parseStorageUrlInBucket(image.url, ACTIVITY_BUCKET)) {
      failTo(formPath, "Une image ne provient pas du stockage Péyi.");
    }
  }

  const city = await prisma.city.findUnique({
    where: { slug: values.citySlug },
    select: { id: true },
  });
  if (!city) failTo(formPath, "Commune inconnue.");

  const openingHours = buildOpeningHoursJson(values);
  const data = {
    name: values.name,
    tagline: values.tagline,
    description: values.description,
    category: values.category,
    tags: values.tags,
    latitude: values.latitude,
    longitude: values.longitude,
    cityId: city.id,
    address: values.address ?? null,
    startPoint: values.startPoint ?? null,
    accessModes: values.accessModes,
    durationMinutes: values.durationMinutes ?? null,
    difficulty: values.difficulty ?? null,
    seasons: values.seasons,
    accessNote: values.accessNote ?? null,
    priceMinCents: values.isFree ? null : eurosToCents(values.priceMin),
    priceMaxCents: values.isFree ? null : eurosToCents(values.priceMax),
    isFree: values.isFree,
    bookingRequired: values.bookingRequired,
    bookingUrl: values.bookingUrl ?? null,
    phone: values.phone ?? null,
    whatsapp: values.whatsapp ?? null,
    website: values.website ?? null,
    instagram: values.instagram ?? null,
    isFeatured: values.isFeatured,
    openingHours:
      openingHours === null
        ? Prisma.JsonNull
        : (openingHours as Prisma.InputJsonValue),
  };

  const imagesCreate = values.images.map((image, index) => ({
    url: image.url,
    altText: image.altText,
    sortOrder: index,
  }));

  let slug: string;
  let activityId: string;

  if (values.id) {
    const existing = await prisma.activity.findUnique({
      where: { id: values.id },
      select: { id: true, slug: true },
    });
    if (!existing) failTo(LIST_PATH, "Activité introuvable.");

    // Le slug ne change pas au renommage : les URLs publiques indexées
    // ne doivent pas casser.
    await prisma.$transaction([
      prisma.activity.update({ where: { id: existing.id }, data }),
      prisma.activityImage.deleteMany({ where: { activityId: existing.id } }),
      ...(imagesCreate.length > 0
        ? [
            prisma.activityImage.createMany({
              data: imagesCreate.map((image) => ({
                ...image,
                activityId: existing.id,
              })),
            }),
          ]
        : []),
    ]);
    slug = existing.slug;
    activityId = existing.id;

    await logAdminAction({
      adminId: admin.id,
      action: AdminActionType.UPDATE_ACTIVITY,
      targetType: AdminTargetType.ACTIVITY,
      targetId: activityId,
      metadata: { slug, name: values.name },
    });
  } else {
    slug = await ensureUniqueSlug(values.name);
    const created = await prisma.activity.create({
      data: {
        ...data,
        slug,
        status: ActivityStatus.DRAFT,
        ...(imagesCreate.length > 0
          ? { images: { createMany: { data: imagesCreate } } }
          : {}),
      },
      select: { id: true },
    });
    activityId = created.id;

    await logAdminAction({
      adminId: admin.id,
      action: AdminActionType.CREATE_ACTIVITY,
      targetType: AdminTargetType.ACTIVITY,
      targetId: activityId,
      metadata: { slug, name: values.name },
    });
  }

  revalidatePublicActivityPages(slug);
  redirect(
    `${LIST_PATH}?success=${encodeURIComponent(
      values.id ? "Activité mise à jour." : "Activité créée (brouillon).",
    )}`,
  );
}

const STATUS_LABEL: Record<ActivityStatus, string> = {
  DRAFT: "repassée en brouillon",
  PENDING_REVIEW: "soumise à relecture",
  PUBLISHED: "publiée",
  HIDDEN: "masquée",
};

export async function adminSetActivityStatusAction(formData: FormData) {
  const admin = await requireRole(UserRole.ADMIN, LIST_PATH);

  const id = String(formData.get("activityId") ?? "");
  const statusRaw = String(formData.get("status") ?? "");
  if (!id || !(statusRaw in ActivityStatus)) {
    failTo(LIST_PATH, "Demande invalide.");
  }
  const status = statusRaw as ActivityStatus;

  const activity = await prisma.activity.findUnique({
    where: { id },
    select: { id: true, slug: true, status: true, name: true },
  });
  if (!activity) failTo(LIST_PATH, "Activité introuvable.");

  await prisma.activity.update({ where: { id }, data: { status } });

  await logAdminAction({
    adminId: admin.id,
    action: AdminActionType.SET_ACTIVITY_STATUS,
    targetType: AdminTargetType.ACTIVITY,
    targetId: activity.id,
    metadata: {
      slug: activity.slug,
      from: activity.status,
      to: status,
    },
  });

  revalidatePublicActivityPages(activity.slug);
  redirect(
    `${LIST_PATH}?success=${encodeURIComponent(
      `« ${activity.name} » ${STATUS_LABEL[status]}.`,
    )}`,
  );
}

export async function adminDeleteActivityAction(formData: FormData) {
  const admin = await requireRole(UserRole.ADMIN, LIST_PATH);

  const id = String(formData.get("activityId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim() || null;
  if (!id) failTo(LIST_PATH, "Activité introuvable.");

  const activity = await prisma.activity.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      name: true,
      images: { select: { url: true } },
    },
  });
  if (!activity) failTo(LIST_PATH, "Activité introuvable.");

  await prisma.activity.delete({ where: { id: activity.id } });

  // Cleanup storage best-effort (les rows images tombent via onDelete).
  removeActivityImages(activity.images.map((image) => image.url)).catch(
    () => {},
  );

  await logAdminAction({
    adminId: admin.id,
    action: AdminActionType.DELETE_ACTIVITY,
    targetType: AdminTargetType.ACTIVITY,
    targetId: activity.id,
    reason,
    metadata: { slug: activity.slug, name: activity.name },
  });

  revalidatePublicActivityPages(activity.slug);
  redirect(
    `${LIST_PATH}?success=${encodeURIComponent(
      `« ${activity.name} » supprimée.`,
    )}`,
  );
}
