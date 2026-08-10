import type { Metadata } from "next";
import Link from "next/link";
import { UserRole } from "@prisma/client";
import { ArrowLeft } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/current-user";
import { ActivityForm } from "@/components/admin/ActivityForm";
import { adminSaveActivityAction } from "../actions";

export const metadata: Metadata = {
  title: "Nouvelle activité",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type SearchParams = { error?: string };

export default async function AdminNewActivityPage(props: {
  searchParams: Promise<SearchParams>;
}) {
  await requireRole(UserRole.ADMIN, "/admin/activites/nouveau");
  const searchParams = await props.searchParams;

  const cities = await prisma.city.findMany({
    select: { slug: true, name: true },
    orderBy: { name: "asc" },
  });

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
          Nouvelle activité
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          La fiche est créée en brouillon — tu la publies ensuite depuis la
          liste (workflow brouillon → relecture → publiée).
        </p>
      </header>

      {searchParams.error && (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
          {searchParams.error}
        </p>
      )}

      <ActivityForm cities={cities} action={adminSaveActivityAction} />
    </div>
  );
}
