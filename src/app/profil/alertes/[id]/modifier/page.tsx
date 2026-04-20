import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/current-user";
import { SubmitButton } from "@/components/ui/submit-button";
import { AlertFormFields } from "@/components/alerts/AlertFormFields";

import { updateAlertAction } from "../../actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Modifier l'alerte",
  robots: { index: false, follow: false },
};

type Params = { id: string };
type SearchParams = { error?: string };

export default async function ModifierAlertePage(props: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ id }, searchParams] = await Promise.all([
    props.params,
    props.searchParams,
  ]);
  const user = await requireUser(`/profil/alertes/${id}/modifier`);

  const alert = await prisma.alert.findFirst({
    where: { id, userId: user.id },
    select: {
      id: true,
      name: true,
      keywords: true,
      type: true,
      categoryId: true,
      cityId: true,
      minPrice: true,
      maxPrice: true,
    },
  });

  if (!alert) notFound();

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
          <Pencil className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Modifier l&apos;alerte
          </h1>
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

      <form action={updateAlertAction} className="mt-6">
        <input type="hidden" name="id" value={alert.id} />
        <AlertFormFields
          defaults={{
            name: alert.name,
            keywords: alert.keywords,
            type: alert.type,
            categoryId: alert.categoryId,
            cityId: alert.cityId,
            minPrice: alert.minPrice ? Number(alert.minPrice) : null,
            maxPrice: alert.maxPrice ? Number(alert.maxPrice) : null,
          }}
          categories={categories}
          cities={cities}
        />

        <SubmitButton
          size="lg"
          className="mt-6 w-full"
          pendingLabel="Enregistrement…"
        >
          Enregistrer
        </SubmitButton>
      </form>
    </main>
  );
}
