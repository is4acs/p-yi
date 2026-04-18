import type { Metadata } from "next";
import Link from "next/link";
import { Flame, Plus, Tag } from "lucide-react";

import { fetchDealsPage, fetchUserFavoriteSet, fetchUserVoteMap } from "@/lib/deals/queries";
import {
  fetchListingsPage,
  fetchUserFavoriteListingSet,
} from "@/lib/listings/queries";
import { getCurrentUser } from "@/lib/auth/current-user";

import { Button } from "@/components/ui/button";
import { DealCard } from "@/components/deals/DealCard";
import { HomeCategoriesGrid } from "@/components/home/HomeCategoriesGrid";
import { HomeSearchBar } from "@/components/home/HomeSearchBar";
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
  const [{ deals }, { listings }, currentUser] = await Promise.all([
    fetchDealsPage({ sort: "hot", page: 1, category: null, city: null, q: null }),
    fetchListingsPage({
      sort: "new",
      page: 1,
      category: null,
      city: null,
      type: null,
      q: null,
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

      {/* Hero — refonte S27 : titre "valeur" + SearchBar hero + 1 CTA primary.
          Fond dégradé orange très subtil pour démarquer la zone hero sans
          voler la vedette aux catégories qui suivent. */}
      <section className="-mx-4 bg-gradient-to-b from-peyi-orange-50/70 to-transparent px-4 pb-8 pt-10 sm:mx-0 sm:px-0 sm:pb-12 sm:pt-14">
        <p className="font-mono text-eyebrow uppercase text-peyi-orange-700">
          Marketplace 100% Guyane
        </p>
        <h1 className="mt-2 font-display text-title-md font-extrabold tracking-tight text-ink-900 sm:text-title-lg">
          Le marché local
          <br />
          de la <span className="text-peyi-orange-600">Guyane</span>
        </h1>
        <p className="mt-3 max-w-md text-base text-ink-500 sm:text-lede">
          Achat · Vente · Bons plans — entre Guyanais, près de chez toi.
        </p>

        <div className="mt-6">
          <HomeSearchBar />
        </div>

        <div className="mt-5 flex items-center gap-3">
          <Button asChild variant="peyi" size="peyi">
            <Link href="/poster">
              <Plus aria-hidden />
              Poster une annonce
            </Link>
          </Button>
          <span className="text-sm text-ink-500">
            Gratuit, en 2 minutes
          </span>
        </div>
      </section>

      {/* Catégories — grille 2×4 (mobile) / 4×2 (desktop), tuiles colorées */}
      <HomeCategoriesGrid />

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
