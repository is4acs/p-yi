import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/current-user";
import { ListingForm } from "@/components/poster/ListingForm";

import { updateListingAction } from "@/app/poster/annonce/actions";

export const metadata: Metadata = {
  title: "Modifier l'annonce",
};

export default async function EditListingPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { error?: string };
}) {
  const user = await requireUser(`/annonces/${params.slug}/edit`);

  const listing = await prisma.listing.findUnique({
    where: { slug: params.slug },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      type: true,
      priceType: true,
      price: true,
      condition: true,
      neighborhood: true,
      contactPhone: true,
      showPhone: true,
      allowMessages: true,
      coverImageUrl: true,
      authorId: true,
      category: { select: { slug: true } },
      city: { select: { slug: true } },
    },
  });
  if (!listing) notFound();
  if (listing.authorId !== user.id) redirect(`/annonces/${listing.slug}`);

  const [categories, cities] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true, type: { in: ["LISTING", "BOTH"] } },
      orderBy: { name: "asc" },
      select: { slug: true, name: true, icon: true },
    }),
    prisma.city.findMany({
      orderBy: { name: "asc" },
      select: { slug: true, name: true },
    }),
  ]);

  const defaults = {
    listingId: listing.id,
    title: listing.title,
    description: listing.description,
    type: listing.type,
    priceType: listing.priceType,
    price: listing.price?.toString() ?? null,
    condition: listing.condition,
    categorySlug: listing.category.slug,
    citySlug: listing.city.slug,
    neighborhood: listing.neighborhood,
    contactPhone: listing.contactPhone,
    showPhone: listing.showPhone,
    allowMessages: listing.allowMessages,
    coverImageUrl: listing.coverImageUrl,
  };

  return (
    <main className="mx-auto max-w-md px-4 pb-16 pt-6 sm:max-w-2xl sm:pt-10">
      <Link
        href={`/annonces/${listing.slug}`}
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Retour à l&apos;annonce
      </Link>

      <div className="mt-4">
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Modifier l&apos;annonce
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Mets à jour les détails de ton annonce.
        </p>
      </div>

      {searchParams.error && (
        <div
          role="alert"
          className="mt-5 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {searchParams.error}
        </div>
      )}

      <div className="mt-6">
        <ListingForm
          action={updateListingAction}
          categories={categories}
          cities={cities}
          defaults={defaults}
          submitLabel="Enregistrer"
        />
      </div>
    </main>
  );
}
