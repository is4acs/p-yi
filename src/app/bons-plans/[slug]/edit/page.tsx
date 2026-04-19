import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/current-user";
import { DealForm } from "@/components/poster/DealForm";
import { DealPosterLayout } from "@/components/poster/DealPosterLayout";

import { updateDealAction } from "@/app/poster/actions";

export const metadata: Metadata = {
  title: "Modifier le bon plan",
};

export default async function EditDealPage(
  props: {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ error?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const user = await requireUser(`/bons-plans/${params.slug}/edit`);

  const deal = await prisma.deal.findUnique({
    where: { slug: params.slug },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      price: true,
      originalPrice: true,
      externalUrl: true,
      coverImageUrl: true,
      expiresAt: true,
      authorId: true,
      category: { select: { slug: true } },
      city: { select: { slug: true } },
      store: { select: { name: true } },
    },
  });
  if (!deal) notFound();
  if (deal.authorId !== user.id) redirect(`/bons-plans/${deal.slug}`);

  const [categories, cities, storesRaw] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true, type: { in: ["DEAL", "BOTH"] } },
      orderBy: { name: "asc" },
      select: { slug: true, name: true, icon: true },
    }),
    prisma.city.findMany({
      orderBy: { name: "asc" },
      select: { slug: true, name: true },
    }),
    prisma.store.findMany({
      orderBy: { name: "asc" },
      select: { slug: true, name: true, city: { select: { slug: true } } },
    }),
  ]);

  const stores = storesRaw.map((s) => ({
    slug: s.slug,
    name: s.name,
    citySlug: s.city.slug,
  }));

  const defaults = {
    dealId: deal.id,
    title: deal.title,
    description: deal.description,
    price: deal.price.toString(),
    originalPrice: deal.originalPrice?.toString() ?? null,
    externalUrl: deal.externalUrl,
    categorySlug: deal.category.slug,
    citySlug: deal.city?.slug ?? null,
    storeName: deal.store?.name ?? null,
    expiresAt: deal.expiresAt
      ? deal.expiresAt.toISOString().slice(0, 10)
      : null,
    coverImageUrl: deal.coverImageUrl,
  };

  return (
    // lg:max-w-5xl : même empreinte que `/poster` — l'édition utilise
    // la même preview live pour montrer l'état final après save.
    <main className="mx-auto max-w-md px-4 pb-16 pt-6 sm:max-w-2xl sm:pt-10 lg:max-w-5xl">
      <Link
        href={`/bons-plans/${deal.slug}`}
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Retour au bon plan
      </Link>
      <div className="mt-4">
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Modifier le bon plan
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Mets à jour les détails de ton offre.
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
        <DealPosterLayout
          categories={categories}
          cities={cities}
          defaults={{
            title: defaults.title,
            price: defaults.price,
            originalPrice: defaults.originalPrice,
            categorySlug: defaults.categorySlug,
            citySlug: defaults.citySlug,
            storeName: defaults.storeName,
          }}
        >
          <DealForm
            action={updateDealAction}
            categories={categories}
            cities={cities}
            stores={stores}
            defaults={defaults}
            submitLabel="Enregistrer"
          />
        </DealPosterLayout>
      </div>
    </main>
  );
}
