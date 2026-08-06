"use client";

import { loadMoreDealsAction } from "@/app/bons-plans/feed-actions";
import { LoadMoreFeed } from "@/components/feed/LoadMoreFeed";

/**
 * Liaison entre `/bons-plans` et le feed continu générique.
 *
 * Ne porte aucune logique : elle capture les filtres actifs (valeurs
 * primitives, donc sérialisables vers le client) et les rejoue à chaque
 * demande de page suivante. Elle existe uniquement parce qu'un composant
 * serveur ne peut pas passer une closure à un composant client — mais un
 * composant client, lui, peut appeler une server action directement.
 */

type Props = {
  children: React.ReactNode;
  initialHasMore: boolean;
  initialNextPage: number;
  sort: string;
  category: string | null;
  city: string | null;
  q: string | null;
};

export function DealsFeed({
  children,
  initialHasMore,
  initialNextPage,
  sort,
  category,
  city,
  q,
}: Props) {
  return (
    <LoadMoreFeed
      initialHasMore={initialHasMore}
      initialNextPage={initialNextPage}
      itemLabel="bons plans"
      moreLabel="Voir plus de bons plans"
      endLabel="Tu as vu tous les bons plans. Affine ta recherche pour en trouver d'autres."
      aria-label="Liste des bons plans"
      listClassName="flex flex-col gap-3"
      loadMore={(page) =>
        loadMoreDealsAction({ page, sort, category, city, q })
      }
    >
      {children}
    </LoadMoreFeed>
  );
}
