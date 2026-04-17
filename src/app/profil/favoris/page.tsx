import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Bookmark } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/current-user";
import { DealStatus } from "@prisma/client";
import {
  dealCardSelect,
  fetchUserVoteMap,
  type DealCardData,
} from "@/lib/deals/queries";
import { DealCard } from "@/components/deals/DealCard";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mes favoris",
  description: "Les bons plans que tu as sauvegardés.",
};

export default async function FavorisPage() {
  const user = await requireUser("/profil/favoris");

  const favorites = await prisma.favorite.findMany({
    where: {
      userId: user.id,
      dealId: { not: null },
      deal: { status: DealStatus.PUBLISHED },
    },
    orderBy: { createdAt: "desc" },
    select: {
      createdAt: true,
      deal: { select: dealCardSelect },
    },
  });

  const deals: DealCardData[] = favorites
    .map((f) => f.deal)
    .filter((d): d is DealCardData => Boolean(d));

  const voteMap = await fetchUserVoteMap(
    user.id,
    deals.map((d) => d.id),
  );

  return (
    <main className="mx-auto max-w-md px-4 pb-16 pt-6 sm:max-w-2xl sm:pt-10">
      <Link
        href="/profil"
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Profil
      </Link>

      <div className="mt-4">
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Mes favoris
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {deals.length === 0
            ? "Aucun bon plan sauvegardé pour l'instant."
            : `${deals.length} bon${deals.length > 1 ? "s" : ""} plan${
                deals.length > 1 ? "s" : ""
              } sauvegardé${deals.length > 1 ? "s" : ""}.`}
        </p>
      </div>

      {deals.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-border bg-muted/40 p-6 text-center">
          <Bookmark className="mx-auto h-8 w-8 text-peyi-orange-500" aria-hidden />
          <p className="mt-3 text-sm text-muted-foreground">
            Utilise le bouton <span className="font-semibold">signet</span> sur un
            bon plan pour le sauvegarder ici.
          </p>
          <Button asChild size="sm" className="mt-4">
            <Link href="/bons-plans">Parcourir les bons plans</Link>
          </Button>
        </div>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {deals.map((d) => (
            <li key={d.id}>
              <DealCard
                deal={d}
                currentUserId={user.id}
                myVote={voteMap.get(d.id) ?? null}
                isFavorited
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
