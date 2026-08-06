"use server";

import {
  fetchListingsPage,
  fetchUserFavoriteListingSet,
  PAGE_SIZE,
} from "@/lib/listings/queries";
import {
  parseFilters,
  parseQuery,
  parseSort,
  parseType,
} from "@/lib/listings/url";
import { getCurrentUser } from "@/lib/auth/current-user";
import { withTimeout } from "@/lib/async/with-timeout";
import { ListingCardTile } from "@/components/listings/ListingCardTile";

/**
 * Server action du feed continu `/annonces` — pendant exact de
 * `loadMoreDealsAction` côté bons plans (voir ce fichier pour le
 * détail des choix : rendu RSC des cartes, validation des entrées,
 * borne sur la page).
 *
 * Spécificité annonces : les filtres attributaires (prix, année, km,
 * surface, pièces, carburant, marque, contrat) transitent sous leur
 * forme URL brute et repassent par `parseFilters`, qui applique les
 * allow-lists et les bornes hautes. On ne fait jamais confiance à un
 * objet `filters` déjà typé venant du client.
 */

const MAX_PAGE = 200;
const FEED_TIMEOUT_MS = 4_500;

export async function loadMoreListingsAction(input: {
  page: number;
  sort?: string | null;
  category?: string | null;
  city?: string | null;
  type?: string | null;
  q?: string | null;
  /** Filtres attributaires sous forme de paires URL (`prixMin`, `kmMax`…). */
  filterParams?: Record<string, string>;
}) {
  const page =
    Number.isFinite(input.page) && input.page >= 2
      ? Math.min(Math.floor(input.page), MAX_PAGE)
      : 2;
  const sort = parseSort(input.sort);
  const q = parseQuery(input.q);
  const type = parseType(input.type);
  const category = input.category?.trim().slice(0, 100) || null;
  const city = input.city?.trim().slice(0, 100) || null;
  const filters = parseFilters(input.filterParams);

  try {
    const [{ listings, total }, currentUser] = await Promise.all([
      withTimeout(
        fetchListingsPage({ sort, page, category, city, type, q, filters }),
        FEED_TIMEOUT_MS,
        "listings/feed-load-more",
      ),
      withTimeout(
        getCurrentUser(),
        FEED_TIMEOUT_MS,
        "listings/feed-user",
      ).catch(() => null),
    ]);

    const favoriteSet = await fetchUserFavoriteListingSet(
      currentUser?.id ?? null,
      listings.map((l) => l.id),
    );

    return {
      nodes: listings.map((l) => (
        <li key={l.id}>
          <ListingCardTile
            listing={l}
            currentUserId={currentUser?.id ?? null}
            isFavorited={favoriteSet.has(l.id)}
          />
        </li>
      )),
      hasMore: page * PAGE_SIZE < total,
      nextPage: page + 1,
      count: listings.length,
    };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[listings/feed] load more failed", { page, sort, err });
    return {
      nodes: null,
      hasMore: true,
      nextPage: page,
      count: 0,
      error: "Chargement impossible pour le moment.",
    };
  }
}
