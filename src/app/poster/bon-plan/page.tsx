import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/current-user";
import { DealForm } from "@/components/poster/DealForm";
import { DealPosterLayout } from "@/components/poster/DealPosterLayout";
import { BackHeader } from "@/components/soleil/BackHeader";
import { PosterFork } from "@/components/soleil/PosterFork";

import { createDealAction } from "@/app/poster/actions";

export const metadata: Metadata = {
  title: "Poster un bon plan",
  description: "Partage tes meilleures affaires avec la communauté Péyi.",
  robots: { index: false, follow: false },
};

export default async function PosterPage(
  props: {
    searchParams: Promise<{ error?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const user = await requireUser("/poster/bon-plan");

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
    // lg:max-w-5xl pour accueillir l'aside sticky (preview + tips) de
    // DealPosterLayout. En dessous de lg le formulaire reste en max-w-md.
    <main className="min-h-screen bg-soleil-cream pb-16 text-soleil-forest animate-in fade-in duration-300 dark:bg-soleil-night dark:text-soleil-cream">
      <div className="mx-auto w-full max-w-md lg:max-w-5xl">
        <BackHeader title="Poster" backHref="/poster" />
        <h1 className="sr-only">Poster un bon plan</h1>

        <div className="px-5">
          <PosterFork selected="deal" className="pt-4" />
          <p className="pt-3 text-xs text-soleil-muted dark:text-soleil-muted-d">
            Partage une promo, un prix fou ou un deal caché. +5 karma pour
            toi, @{user.username}.
          </p>

          {searchParams.error && (
            <div
              role="alert"
              className="mt-4 rounded-[14px] border-[1.5px] border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
            >
              {searchParams.error}
            </div>
          )}

          <div className="mt-5">
            <DealPosterLayout categories={categories} cities={cities}>
              <DealForm
                action={createDealAction}
                categories={categories}
                cities={cities}
                stores={stores}
                submitLabel="Publier — c'est gratuit"
              />
            </DealPosterLayout>
          </div>
        </div>
      </div>
    </main>
  );
}
