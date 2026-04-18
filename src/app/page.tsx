import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Flame, Plus, Tag } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { fetchDealsPage, fetchUserFavoriteSet, fetchUserVoteMap } from "@/lib/deals/queries";
import {
  fetchListingsPage,
  fetchUserFavoriteListingSet,
} from "@/lib/listings/queries";
import { buildDealsUrl } from "@/lib/deals/url";
import { getCurrentUser } from "@/lib/auth/current-user";

import { DealCard } from "@/components/deals/DealCard";
import { DealsSearchBar } from "@/components/deals/DealsSearchBar";
import { ListingCard } from "@/components/listings/ListingCard";

export const dynamic = "force-dynamic";

// Le titre du root layout (`Péyi — Bons plans et petites annonces de
// Guyane`) convient déjà à la home ; on surcharge juste pour forcer
// le titre "par défaut" (sans suffixe de template) et poser la
// canonical explicite. Sans ça, la template `%s | Péyi` s'appliquerait
// si on définissait un titre ici.
export const metadata: Metadata = {
  title: {
    absolute: "Péyi — Bons plans et petites annonces de Guyane",
  },
  alternates: { canonical: "/" },
  openGraph: {
    url: "/",
  },
};

const HOME_DEALS_COUNT = 6;
const HOME_LISTINGS_COUNT = 4;

type Props = {
  searchParams?: { deleted?: string };
};

export default async function HomePage({ searchParams }: Props) {
  const [{ deals }, { listings }, categories, currentUser] = await Promise.all([
    fetchDealsPage({ sort: "hot", page: 1, category: null, city: null, q: null }),
    fetchListingsPage({
      sort: "new",
      page: 1,
      category: null,
      city: null,
      type: null,
      q: null,
    }),
    prisma.category.findMany({
      where: { type: "DEAL", isActive: true },
      orderBy: { sortOrder: "asc" },
      take: 8,
      select: { slug: true, name: true, icon: true },
    }),
    getCurrentUser(),
  ]);

  const topDeals = deals.slice(0, HOME_DEALS_COUNT);
  const topListings = listings.slice(0, HOME_LISTINGS_COUNT);
  const dealIds = topDeals.map((d) => d.id);
  const listingIds = topListings.map((l) => l.id);
  const [voteMap, favoriteSet, listingFavoriteSet] = await Promise.all([
    fetchUserVoteMap(currentUser?.id ?? null, dealIds),
    fetchUserFavoriteSet(currentUser?.id ?? null, dealIds),
    fetchUserFavoriteListingSet(currentUser?.id ?? null, listingIds),
  ]);

  return (
    <main className="mx-auto max-w-md pb-12 animate-in fade-in duration-300 sm:max-w-2xl">
      {searchParams?.deleted === "1" && (
        <div
          role="status"
          className="mx-4 mt-4 rounded-lg border border-peyi-green-200 bg-peyi-green-50 p-3 text-sm text-peyi-green-900 sm:mx-0"
        >
          Ton compte a bien été supprimé. Merci d&apos;avoir fait partie de
          l&apos;aventure Péyi.
        </div>
      )}

      {/* Hero */}
      <section className="px-4 pt-6 sm:px-0 sm:pt-10">
        <p className="text-xs font-semibold uppercase tracking-wide text-peyi-orange-600">
          Bienvenue sur
        </p>
        <h1 className="mt-1 font-display text-4xl font-bold tracking-tight sm:text-5xl">
          Péyi
        </h1>
        <p className="mt-2 text-base text-muted-foreground sm:text-lg">
          Les bons plans et petites annonces, 100% Guyane.
        </p>

        <div className="mt-5">
          <DealsSearchBar placeholder="Rechercher un bon plan…" />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/bons-plans"
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-peyi-orange-500 px-4 text-sm font-semibold text-white transition hover:bg-peyi-orange-600"
          >
            Voir tous les bons plans
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link
            href="/poster"
            className="inline-flex h-10 items-center gap-1.5 rounded-full border border-border bg-background px-4 text-sm font-semibold text-foreground transition hover:border-peyi-orange-300"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Poster un bon plan
          </Link>
        </div>
      </section>

      {/* Catégories */}
      {categories.length > 0 && (
        <section className="mt-8 px-4 sm:px-0">
          <h2 className="font-display text-lg font-semibold">
            Explorer par catégorie
          </h2>
          <ul className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
            {categories.map((c) => (
              <li key={c.slug} className="shrink-0">
                <Link
                  href={buildDealsUrl({ category: c.slug })}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-background px-3 text-sm font-medium text-foreground transition hover:border-peyi-orange-300 hover:text-peyi-orange-700"
                >
                  {c.icon && <span aria-hidden>{c.icon}</span>}
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Deals chauds */}
      <section className="mt-8 px-4 sm:px-0">
        <div className="flex items-end justify-between gap-3">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <Flame className="h-5 w-5 text-hot" aria-hidden />
            Tendance en ce moment
          </h2>
          <Link
            href="/bons-plans"
            className="text-sm font-medium text-peyi-orange-600 hover:text-peyi-orange-700"
          >
            Tout voir
          </Link>
        </div>

        {topDeals.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-border bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">
            Aucun bon plan pour l&apos;instant. Sois le premier à en poster !
          </div>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {topDeals.map((d) => (
              <li key={d.id}>
                <DealCard
                  deal={d}
                  currentUserId={currentUser?.id ?? null}
                  myVote={voteMap.get(d.id) ?? null}
                  isFavorited={favoriteSet.has(d.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Petites annonces */}
      <section className="mt-10 px-4 sm:px-0">
        <div className="flex items-end justify-between gap-3">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <Tag className="h-5 w-5 text-peyi-green-600" aria-hidden />
            Dernières annonces
          </h2>
          <Link
            href="/annonces"
            className="text-sm font-medium text-peyi-orange-600 hover:text-peyi-orange-700"
          >
            Tout voir
          </Link>
        </div>

        {topListings.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-border bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">
            Aucune annonce pour l&apos;instant.
            <Link
              href="/poster/annonce"
              className="ml-1 font-medium text-peyi-orange-600 hover:underline"
            >
              Publier la première.
            </Link>
          </div>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {topListings.map((l) => (
              <li key={l.id}>
                <ListingCard
                  listing={l}
                  currentUserId={currentUser?.id ?? null}
                  isFavorited={listingFavoriteSet.has(l.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
