import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/current-user";
import { ListingForm } from "@/components/poster/ListingForm";

import { createListingAction } from "./actions";

export const metadata: Metadata = {
  title: "Poster une annonce",
  description:
    "Vends, échange ou donne près de chez toi. Publie ton annonce sur Péyi.",
};

export default async function PosterAnnoncePage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const user = await requireUser("/poster/annonce");

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

  return (
    <main className="mx-auto max-w-md px-4 pb-16 pt-6 animate-in fade-in duration-300 sm:max-w-2xl sm:pt-10">
      <Link
        href="/annonces"
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Annuler
      </Link>

      <div className="mt-4">
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Poster une annonce
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Vends, loue, échange ou donne près de chez toi. +3 karma pour toi,
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
        <ListingForm
          action={createListingAction}
          categories={categories}
          cities={cities}
          defaults={{
            // Only auto-fill when the phone is verified — an unverified number
            // would weaken the trust signal we show on listing cards.
            contactPhone: user.phoneVerified ? user.phone : null,
            // Match the toggle default with whether we have something usable.
            showPhone: Boolean(user.phoneVerified && user.phone),
          }}
          profilePhone={user.phone}
          profilePhoneVerified={user.phoneVerified}
          submitLabel="Publier l'annonce"
        />
      </div>
    </main>
  );
}
