import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/current-user";
import { pickRegisteredAttributes } from "@/lib/listings/field-registry";
import { ListingForm } from "@/components/poster/ListingForm";

import { updateListingAction } from "@/app/poster/annonce/actions";

export const metadata: Metadata = {
  title: "Modifier l'annonce",
  robots: { index: false, follow: false },
};

export default async function EditListingPage(
  props: {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ error?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
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
      attributes: true,
      authorId: true,
      category: { select: { slug: true } },
      city: { select: { slug: true } },
      images: {
        orderBy: { sortOrder: "asc" },
        select: { url: true },
      },
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

  // Gallery backward-compat : listings created before Session 15 only have
  // `coverImageUrl` without any ListingImage rows — surface that single
  // photo so the user can reorder/complete their gallery.
  const photoUrls =
    listing.images.length > 0
      ? listing.images.map((i) => i.url)
      : listing.coverImageUrl
      ? [listing.coverImageUrl]
      : [];

  // Filtre les attributs stockés pour ne remonter que ceux qui appartiennent
  // au registry actuel de la catégorie — si un admin a re-catégorisé une
  // annonce, on évite de reprojeter des champs orphelins dans le form.
  const attributes = pickRegisteredAttributes(
    listing.category.slug,
    listing.attributes,
  );

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
    photoUrls,
    attributes,
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
          profilePhone={user.phone}
          profilePhoneVerified={user.phoneVerified}
          submitLabel="Enregistrer"
        />
      </div>
    </main>
  );
}
