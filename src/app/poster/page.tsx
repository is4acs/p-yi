import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/current-user";
import { DealForm } from "@/components/poster/DealForm";
import { DealPosterLayout } from "@/components/poster/DealPosterLayout";

import { createDealAction } from "./actions";

export const metadata: Metadata = {
  title: "Poster un bon plan",
  description: "Partage tes meilleures affaires avec la communauté Péyi.",
};

export default async function PosterPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const user = await requireUser("/poster");

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

  return (
    // lg:max-w-5xl pour accueillir l'aside sticky (preview + tips).
    // En dessous de lg on garde max-w-2xl — le formulaire reste lisible
    // sans se diluer dans l'espace blanc.
    <main className="mx-auto max-w-md px-4 pb-16 pt-6 animate-in fade-in duration-300 sm:max-w-2xl sm:pt-10 lg:max-w-5xl">
      <Link
        href="/bons-plans"
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Annuler
      </Link>

      <div className="mt-4">
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Poster un bon plan
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Partage une promo, un prix fou ou un deal caché. +5 karma pour toi,
          @{user.username}.
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
          stores={stores}
        >
          <DealForm
            action={createDealAction}
            categories={categories}
            cities={cities}
            stores={stores}
            submitLabel="Publier le bon plan"
          />
        </DealPosterLayout>
      </div>
    </main>
  );
}
