import Link from "next/link";
import type { Metadata } from "next";
import { AlertType } from "@prisma/client";
import { ArrowLeft, Bell } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/current-user";
import { SubmitButton } from "@/components/ui/submit-button";
import { AlertFormFields } from "@/components/alerts/AlertFormFields";

import { createAlertAction } from "../actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Nouvelle alerte",
  description: "Crée une alerte sur Péyi.",
  robots: { index: false, follow: false },
};

type SearchParams = { error?: string };

export default async function NouvelleAlertePage(props: {
  searchParams: Promise<SearchParams>;
}) {
  const searchParams = await props.searchParams;
  await requireUser("/profil/alertes/nouveau");

  const [categories, cities] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true, parentId: null },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, icon: true },
    }),
    prisma.city.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <main className="mx-auto max-w-md px-4 pb-16 pt-6 animate-in fade-in duration-300 sm:max-w-2xl sm:pt-10">
      <Link
        href="/profil/alertes"
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Retour aux alertes
      </Link>

      <div className="mt-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-peyi-orange-100 text-peyi-orange-700">
          <Bell className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Nouvelle alerte
          </h1>
          <p className="text-sm text-muted-foreground">
            On te prévient dès qu&apos;une nouveauté matche.
          </p>
        </div>
      </div>

      {searchParams.error && (
        <div
          role="alert"
          className="mt-5 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {searchParams.error}
        </div>
      )}

      <form action={createAlertAction} className="mt-6">
        <AlertFormFields
          defaults={{
            name: "",
            keywords: [],
            type: AlertType.BOTH,
            categoryId: null,
            cityId: null,
            minPrice: null,
            maxPrice: null,
          }}
          categories={categories}
          cities={cities}
        />

        <SubmitButton
          size="lg"
          className="mt-6 w-full"
          pendingLabel="Création…"
        >
          Créer l&apos;alerte
        </SubmitButton>
      </form>
    </main>
  );
}
