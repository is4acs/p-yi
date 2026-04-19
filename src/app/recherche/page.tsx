import type { Metadata } from "next";
import Link from "next/link";
import { Flame, Search, Tag } from "lucide-react";

import { fetchDealsPage, fetchUserFavoriteSet, fetchUserVoteMap } from "@/lib/deals/queries";
import { fetchListingsPage, fetchUserFavoriteListingSet } from "@/lib/listings/queries";
import { getCurrentUser } from "@/lib/auth/current-user";
import { DealCard } from "@/components/deals/DealCard";
import { ListingCard } from "@/components/listings/ListingCard";

export const dynamic = "force-dynamic";

type SearchParams = { q?: string };

const TOP_N = 6;

export async function generateMetadata(props: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const searchParams = await props.searchParams;
  const q = (searchParams.q ?? "").trim();
  return {
    title: q ? `Recherche : ${q}` : "Recherche",
    description: q
      ? `Résultats pour "${q}" dans les bons plans et petites annonces de Guyane.`
      : "Cherche un bon plan ou une annonce partout sur Péyi.",
    alternates: { canonical: "/recherche" },
    // Pages de recherche internes : noindex pour éviter la duplication
    // de contenu et le spam d'URLs aspirées dans Google.
    robots: { index: false, follow: true },
  };
}

/**
 * Page de recherche transverse : agrège les `TOP_N` meilleurs deals et
 * annonces matching le terme `q`. Les deux requêtes sont exécutées en
 * parallèle côté serveur. Pour un résultat exhaustif, des liens vers
 * `/bons-plans?q=…` et `/annonces?q=…` sont proposés en bas de chaque
 * section — on ne refait pas de pagination custom ici.
 */
export default async function RecherchePage(props: {
  searchParams: Promise<SearchParams>;
}) {
  const searchParams = await props.searchParams;
  const q = (searchParams.q ?? "").trim();

  if (!q) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <header className="flex items-center gap-2">
          <Search className="h-5 w-5 text-muted-foreground" aria-hidden />
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Recherche
          </h1>
        </header>
        <p className="mt-3 text-sm text-muted-foreground">
          Entre un terme dans la barre en haut de la page pour chercher un
          bon plan ou une annonce.
        </p>
      </main>
    );
  }

  const currentUser = await getCurrentUser();

  const [{ deals }, { listings }] = await Promise.all([
    fetchDealsPage({
      sort: "hot",
      page: 1,
      category: null,
      city: null,
      q,
    }),
    fetchListingsPage({
      sort: "new",
      page: 1,
      category: null,
      city: null,
      type: null,
      q,
    }),
  ]);

  const topDeals = deals.slice(0, TOP_N);
  const topListings = listings.slice(0, TOP_N);
  const dealIds = topDeals.map((d) => d.id);
  const listingIds = topListings.map((l) => l.id);

  const [voteMap, dealFavoriteSet, listingFavoriteSet] = await Promise.all([
    fetchUserVoteMap(currentUser?.id ?? null, dealIds),
    fetchUserFavoriteSet(currentUser?.id ?? null, dealIds),
    fetchUserFavoriteListingSet(currentUser?.id ?? null, listingIds),
  ]);

  const totalHits = topDeals.length + topListings.length;

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
      <header className="flex items-center gap-2">
        <Search className="h-5 w-5 text-muted-foreground" aria-hidden />
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Résultats pour « {q} »
        </h1>
      </header>
      <p className="mt-1 text-sm text-muted-foreground">
        {totalHits === 0
          ? "Aucun résultat trouvé."
          : `${topDeals.length} bon${topDeals.length > 1 ? "s" : ""} plan${
              topDeals.length > 1 ? "s" : ""
            } · ${topListings.length} annonce${topListings.length > 1 ? "s" : ""}`}
      </p>

      {topDeals.length > 0 && (
        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold">
              <Flame className="h-4 w-4 text-peyi-orange-600" aria-hidden />
              Bons plans
            </h2>
            <Link
              href={`/bons-plans?q=${encodeURIComponent(q)}`}
              className="text-sm font-medium text-peyi-orange-700 hover:underline"
            >
              Tout voir →
            </Link>
          </div>
          <ul className="mt-3 flex flex-col gap-2.5">
            {topDeals.map((deal) => (
              <li key={deal.id}>
                <DealCard
                  deal={deal}
                  currentUserId={currentUser?.id ?? null}
                  myVote={voteMap.get(deal.id) ?? null}
                  isFavorited={dealFavoriteSet.has(deal.id)}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {topListings.length > 0 && (
        <section className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold">
              <Tag className="h-4 w-4 text-peyi-green-700" aria-hidden />
              Annonces
            </h2>
            <Link
              href={`/annonces?q=${encodeURIComponent(q)}`}
              className="text-sm font-medium text-peyi-orange-700 hover:underline"
            >
              Tout voir →
            </Link>
          </div>
          <ul className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {topListings.map((listing) => (
              <li key={listing.id}>
                <ListingCard
                  listing={listing}
                  currentUserId={currentUser?.id ?? null}
                  isFavorited={listingFavoriteSet.has(listing.id)}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {totalHits === 0 && (
        <div className="mt-10 rounded-lg border border-dashed border-border bg-muted/30 px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Aucun résultat pour « {q} ».
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2 text-sm">
            <Link
              href="/bons-plans"
              className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 hover:border-peyi-orange-300"
            >
              <Flame className="h-3.5 w-3.5" aria-hidden />
              Explorer les bons plans
            </Link>
            <Link
              href="/annonces"
              className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 hover:border-peyi-orange-300"
            >
              <Tag className="h-3.5 w-3.5" aria-hidden />
              Explorer les annonces
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
