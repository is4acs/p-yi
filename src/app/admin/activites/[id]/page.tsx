import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { UserRole } from "@prisma/client";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/current-user";
import { ACTIVITY_STATUSES } from "@/lib/activities/labels";
import {
  ActivityForm,
  type ActivityFormInitial,
} from "@/components/admin/ActivityForm";
import { adminSaveActivityAction } from "../actions";

export const metadata: Metadata = {
  title: "Modifier une activité",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type SearchParams = { error?: string };

export default async function AdminEditActivityPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  await requireRole(UserRole.ADMIN, "/admin/activites");
  const { id } = await props.params;
  const searchParams = await props.searchParams;

  const [activity, cities] = await Promise.all([
    prisma.activity.findUnique({
      where: { id },
      include: {
        city: { select: { slug: true } },
        images: {
          orderBy: { sortOrder: "asc" },
          select: { url: true, altText: true, credit: true },
        },
      },
    }),
    prisma.city.findMany({
      select: { slug: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!activity) notFound();

  const initial: ActivityFormInitial = {
    id: activity.id,
    name: activity.name,
    tagline: activity.tagline,
    description: activity.description,
    category: activity.category,
    tags: activity.tags,
    latitude: activity.latitude,
    longitude: activity.longitude,
    citySlug: activity.city.slug,
    address: activity.address,
    startPoint: activity.startPoint,
    accessModes: activity.accessModes,
    durationMinutes: activity.durationMinutes,
    difficulty: activity.difficulty,
    seasons: activity.seasons,
    accessNote: activity.accessNote,
    priceMinCents: activity.priceMinCents,
    priceMaxCents: activity.priceMaxCents,
    isFree: activity.isFree,
    bookingRequired: activity.bookingRequired,
    bookingUrl: activity.bookingUrl,
    phone: activity.phone,
    whatsapp: activity.whatsapp,
    website: activity.website,
    instagram: activity.instagram,
    isFeatured: activity.isFeatured,
    openingHours: activity.openingHours,
    images: activity.images,
  };

  return (
    <div className="max-w-3xl space-y-5">
      <header>
        <Link
          href="/admin/activites"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Retour aux activités
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">
          {activity.name}
        </h1>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
          <span>Statut : {ACTIVITY_STATUSES[activity.status].label}</span>
          <span>·</span>
          <span>/activites/{activity.slug}</span>
          {activity.status === "PUBLISHED" && (
            <>
              <span>·</span>
              <Link
                href={`/activites/${activity.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 hover:text-peyi-orange-700"
              >
                Voir la fiche
                <ExternalLink className="h-3 w-3" aria-hidden />
              </Link>
            </>
          )}
        </p>
      </header>

      {searchParams.error && (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
          {searchParams.error}
        </p>
      )}

      <ActivityForm
        cities={cities}
        activity={initial}
        action={adminSaveActivityAction}
      />
    </div>
  );
}
