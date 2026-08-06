"use client";

import { loadMoreListingsAction } from "@/app/annonces/feed-actions";
import { LoadMoreFeed } from "@/components/feed/LoadMoreFeed";

/**
 * Liaison entre `/annonces` et le feed continu générique — pendant de
 * `DealsFeed` (voir ce fichier pour le pourquoi du wrapper client).
 *
 * Les filtres attributaires transitent sous leur forme URL brute
 * (`{ prixMin: "100", kmMax: "80000" }`) plutôt qu'en objet typé : c'est
 * la forme que `parseFilters` sait valider côté serveur, et ça évite de
 * maintenir deux représentations du même état.
 */

type Props = {
  children: React.ReactNode;
  initialHasMore: boolean;
  initialNextPage: number;
  sort: string;
  category: string | null;
  city: string | null;
  type: string | null;
  q: string | null;
  filterParams: Record<string, string>;
};

export function ListingsFeed({
  children,
  initialHasMore,
  initialNextPage,
  sort,
  category,
  city,
  type,
  q,
  filterParams,
}: Props) {
  return (
    <LoadMoreFeed
      initialHasMore={initialHasMore}
      initialNextPage={initialNextPage}
      itemLabel="annonces"
      moreLabel="Voir plus d'annonces"
      endLabel="Tu as vu toutes les annonces. Affine ta recherche pour en trouver d'autres."
      aria-label="Liste des annonces"
      listClassName="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
      loadMore={(page) =>
        loadMoreListingsAction({
          page,
          sort,
          category,
          city,
          type,
          q,
          filterParams,
        })
      }
    >
      {children}
    </LoadMoreFeed>
  );
}
