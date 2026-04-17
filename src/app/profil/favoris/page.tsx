import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Bookmark } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/current-user";
import { DealStatus, ListingStatus } from "@prisma/client";
import {
  dealCardSelect,
  fetchUserVoteMap,
  type DealCardData,
} from "@/lib/deals/queries";
import {
  listingCardSelect,
  type ListingCardData,
} from "@/lib/listings/queries";
import { DealCard } from "@/components/deals/DealCard";
import { ListingCard } from "@/components/listings/ListingCard";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mes favoris",
  description: "Les bons plans et annonces que tu as sauvegardés.",
};

type Tab = "deals" | "listings";

function parseTab(input: string | undefined): Tab {
  return input === "listings" ? "listings" : "deals";
}

export default async function FavorisPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const user = await requireUser("/profil/favoris");
  const tab = parseTab(searchParams.tab);

  const [dealFavorites, listingFavorites] = await Promise.all([
    prisma.favorite.findMany({
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
    }),
    prisma.favorite.findMany({
      where: {
        userId: user.id,
        listingId: { not: null },
        listing: { status: ListingStatus.PUBLISHED },
      },
      orderBy: { createdAt: "desc" },
      select: {
        createdAt: true,
        listing: { select: listingCardSelect },
      },
    }),
  ]);

  const deals: DealCardData[] = dealFavorites
    .map((f) => f.deal)
    .filter((d): d is DealCardData => Boolean(d));
  const listings: ListingCardData[] = listingFavorites
    .map((f) => f.listing)
    .filter((l): l is ListingCardData => Boolean(l));

  const voteMap = await fetchUserVoteMap(
    user.id,
    deals.map((d) => d.id),
  );

  return (
    <main className="mx-auto max-w-md px-4 pb-16 pt-6 animate-in fade-in duration-300 sm:max-w-2xl sm:pt-10">
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
          {deals.length + listings.length === 0
            ? "Aucun favori pour l'instant."
            : `${deals.length} bon${deals.length > 1 ? "s" : ""} plan${deals.length > 1 ? "s" : ""} · ${listings.length} annonce${listings.length > 1 ? "s" : ""}.`}
        </p>
      </div>

      <nav
        aria-label="Filtrer par type"
        className="mt-5 flex gap-1 rounded-full border border-border bg-muted/50 p-1"
      >
        <TabLink
          href="/profil/favoris"
          active={tab === "deals"}
          label={`Bons plans · ${deals.length}`}
        />
        <TabLink
          href="/profil/favoris?tab=listings"
          active={tab === "listings"}
          label={`Annonces · ${listings.length}`}
        />
      </nav>

      {tab === "deals" ? (
        deals.length === 0 ? (
          <EmptyState
            label="Aucun bon plan sauvegardé."
            cta={{ href: "/bons-plans", label: "Parcourir les bons plans" }}
          />
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
        )
      ) : listings.length === 0 ? (
        <EmptyState
          label="Aucune annonce sauvegardée."
          cta={{ href: "/annonces", label: "Parcourir les annonces" }}
        />
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {listings.map((l) => (
            <li key={l.id}>
              <ListingCard
                listing={l}
                currentUserId={user.id}
                isFavorited
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function TabLink({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={
        "flex-1 rounded-full px-3 py-1.5 text-center text-sm font-medium transition " +
        (active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground")
      }
    >
      {label}
    </Link>
  );
}

function EmptyState({
  label,
  cta,
}: {
  label: string;
  cta: { href: string; label: string };
}) {
  return (
    <div className="mt-6 rounded-lg border border-dashed border-border bg-muted/40 p-6 text-center">
      <Bookmark className="mx-auto h-8 w-8 text-peyi-orange-500" aria-hidden />
      <p className="mt-3 text-sm text-muted-foreground">{label}</p>
      <Button asChild size="sm" className="mt-4">
        <Link href={cta.href}>{cta.label}</Link>
      </Button>
    </div>
  );
}
