"use server";

import {
  fetchDealsPage,
  fetchUserFavoriteSet,
  fetchUserVoteMap,
  PAGE_SIZE,
} from "@/lib/deals/queries";
import { parseQuery, parseSort } from "@/lib/deals/url";
import { getCurrentUser } from "@/lib/auth/current-user";
import { withTimeout } from "@/lib/async/with-timeout";
import { DealCard } from "@/components/deals/DealCard";

/**
 * Server action du feed continu `/bons-plans` (cf. `LoadMoreFeed`).
 *
 * Elle renvoie directement le JSX des cartes plutôt que des données :
 * `DealCard` est un composant serveur qui manipule des `Decimal`
 * Prisma et des `Date`, non sérialisables tels quels vers le client.
 * Next renvoie un payload RSC que React insère dans la liste existante.
 *
 * **Toutes les entrées viennent du client et sont donc hostiles** : on
 * les repasse par les mêmes parsers que la page (`parseSort`,
 * `parseQuery`) et on borne la page demandée. Sans la borne, un
 * `page: 1e9` produirait un `OFFSET` monstrueux côté Postgres — un DoS
 * gratuit sur une action non authentifiée.
 */

// Au-delà, on considère que c'est du scraping ou une main malveillante :
// 200 pages = 4 000 deals, largement au-dessus de tout usage réel.
const MAX_PAGE = 200;
const FEED_TIMEOUT_MS = 4_500;

export async function loadMoreDealsAction(input: {
  page: number;
  sort?: string | null;
  category?: string | null;
  city?: string | null;
  q?: string | null;
}) {
  const page =
    Number.isFinite(input.page) && input.page >= 2
      ? Math.min(Math.floor(input.page), MAX_PAGE)
      : 2;
  const sort = parseSort(input.sort);
  const q = parseQuery(input.q);
  const category = input.category?.trim().slice(0, 100) || null;
  const city = input.city?.trim().slice(0, 100) || null;

  try {
    const [{ deals, total }, currentUser] = await Promise.all([
      withTimeout(
        fetchDealsPage({ sort, page, category, city, q }),
        FEED_TIMEOUT_MS,
        "deals/feed-load-more",
      ),
      withTimeout(getCurrentUser(), FEED_TIMEOUT_MS, "deals/feed-user").catch(
        () => null,
      ),
    ]);

    const dealIds = deals.map((d) => d.id);
    const [voteMap, favoriteSet] = await Promise.all([
      fetchUserVoteMap(currentUser?.id ?? null, dealIds),
      fetchUserFavoriteSet(currentUser?.id ?? null, dealIds),
    ]);

    return {
      nodes: deals.map((d) => (
        <li key={d.id}>
          <DealCard
            deal={d}
            currentUserId={currentUser?.id ?? null}
            myVote={voteMap.get(d.id) ?? null}
            isFavorited={favoriteSet.has(d.id)}
          />
        </li>
      )),
      hasMore: page * PAGE_SIZE < total,
      nextPage: page + 1,
      count: deals.length,
    };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[deals/feed] load more failed", { page, sort, err });
    return {
      nodes: null,
      hasMore: true,
      nextPage: page,
      count: 0,
      error: "Chargement impossible pour le moment.",
    };
  }
}
