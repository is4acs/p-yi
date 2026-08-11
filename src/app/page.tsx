import type { Metadata } from "next";

import { fetchDealsPage } from "@/lib/deals/queries";
import { fetchListingsPage, formatPriceType } from "@/lib/listings/queries";
import { prisma } from "@/lib/prisma";
import { withTimeout } from "@/lib/async/with-timeout";
import { formatRelativeTime } from "@/lib/format";

import { CityChips } from "@/components/home/soleil/CityChips";
import { CounterTiles } from "@/components/home/soleil/CounterTiles";
import { DailyDeal } from "@/components/home/soleil/DailyDeal";
import { HomeActivities } from "@/components/home/soleil/HomeActivities";
import { HotDealsList } from "@/components/home/soleil/HotDealsList";
import { PatajBanner } from "@/components/home/soleil/PatajBanner";
import { SideListings } from "@/components/home/soleil/SideListings";
import { SoleilSearchField } from "@/components/home/soleil/SoleilSearchField";

export const dynamic = "force-dynamic";

// Le titre du root layout convient déjà à la home ; on surcharge juste
// pour forcer le titre "par défaut" (sans suffixe de template) et poser
// la canonical explicite.
export const metadata: Metadata = {
  title: {
    absolute: "Péyi — Bons plans et petites annonces de Guyane",
  },
  alternates: { canonical: "/" },
  openGraph: { url: "/" },
};

const HOME_DATA_TIMEOUT_MS = 4_500;
/** 1 deal en vedette + 3 dans le classement. */
const HOT_LIST_SIZE = 3;
const SIDE_LISTINGS = 3;
const HOME_ACTIVITIES = 2;

const euros = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

/**
 * Accueil « Soleil péyi » (maquettes `#5a` mobile / `#5b` desktop).
 *
 * Deux colonnes sur desktop, une seule empilée sur mobile — l'ordre du
 * DOM suit l'ordre de lecture mobile, si bien que le passage en grille
 * ne réorganise rien de façon surprenante pour un lecteur d'écran.
 *
 * Le chrome (wordmark, onglets, barre du bas, pied de page) vit dans le
 * layout : cette page ne rend que son contenu.
 *
 * Toutes les données sont réelles. Aucun compteur n'est inventé : les
 * tuiles du héros passent par le même seuil que le reste du site, et
 * chaque section disparaît si elle n'a rien à montrer plutôt que
 * d'afficher une coquille vide.
 */
export default async function HomePage() {
  const [dealsResult, listingsResult, activitiesResult, countsResult] =
    await Promise.allSettled([
      withTimeout(
        fetchDealsPage({
          sort: "hot",
          page: 1,
          category: null,
          city: null,
          q: null,
        }),
        HOME_DATA_TIMEOUT_MS,
        "home/deals",
      ),
      withTimeout(
        fetchListingsPage({
          sort: "new",
          page: 1,
          category: null,
          city: null,
          type: null,
          q: null,
        }),
        HOME_DATA_TIMEOUT_MS,
        "home/listings",
      ),
      withTimeout(
        prisma.activity.findMany({
          where: { status: "PUBLISHED" },
          orderBy: { viewCount: "desc" },
          take: HOME_ACTIVITIES,
          select: {
            id: true,
            slug: true,
            name: true,
            isFree: true,
            priceMinCents: true,
            city: { select: { name: true } },
            images: { select: { url: true }, orderBy: { sortOrder: "asc" }, take: 1 },
          },
        }),
        HOME_DATA_TIMEOUT_MS,
        "home/activities",
      ),
      withTimeout(
        Promise.all([
          prisma.deal.count({
            where: {
              status: "PUBLISHED",
              OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
            },
          }),
          prisma.listing.count({
            where: { status: "PUBLISHED", expiresAt: { gt: new Date() } },
          }),
        ]),
        HOME_DATA_TIMEOUT_MS,
        "home/counts",
      ),
    ]);

  // Chaque bloc dégrade indépendamment : une panne sur les activités ne
  // doit pas emporter les bons plans avec elle.
  const deals = dealsResult.status === "fulfilled" ? dealsResult.value.deals : [];
  const listings =
    listingsResult.status === "fulfilled" ? listingsResult.value.listings : [];
  const activities =
    activitiesResult.status === "fulfilled" ? activitiesResult.value : [];
  const [dealCount, listingCount] =
    countsResult.status === "fulfilled" ? countsResult.value : [0, 0];

  for (const [name, result] of [
    ["deals", dealsResult],
    ["listings", listingsResult],
    ["activities", activitiesResult],
    ["counts", countsResult],
  ] as const) {
    if (result.status === "rejected") {
      // eslint-disable-next-line no-console
      console.error(`[home] ${name} load failed`, result.reason);
    }
  }

  // Le deal du jour est simplement le plus chaud — `fetchDealsPage` trie
  // déjà par score « hot » (température pondérée par l'ancienneté).
  const [featured, ...rest] = deals;
  const hotDeals = rest.slice(0, HOT_LIST_SIZE).map((deal) => ({
    id: deal.id,
    slug: deal.slug,
    title: deal.title,
    priceLabel: deal.isFree
      ? "Gratuit"
      : euros.format(Number(deal.price.toString())),
    meta: [
      deal.store?.name ?? deal.merchant?.name ?? null,
      deal.city?.name ?? null,
      formatRelativeTime(deal.publishedAt),
      deal.commentCount > 0
        ? `${deal.commentCount} commentaire${deal.commentCount > 1 ? "s" : ""}`
        : null,
    ]
      .filter(Boolean)
      .join(" · "),
    temperature: deal.temperature,
  }));

  return (
    <main className="mx-auto w-full max-w-6xl animate-in fade-in pb-8 duration-300">
      {/* Héros : titre, recherche, compteurs et communes à gauche ;
          le deal du jour à droite. Sur mobile tout s'empile. */}
      {/* `grid-cols-1` explicite : sans lui, la grille n'a qu'une colonne
          implicite dimensionnée en `auto`, qui refuse de descendre sous la
          largeur min-content de son contenu — le héros dépassait alors de
          128 px, invisible parce que le layout applique `overflow-x-clip`.
          Le contenu était coupé sans possibilité de défiler. */}
      <div className="grid grid-cols-1 gap-5 px-5 pt-4 lg:grid-cols-12 lg:gap-9 lg:px-8 lg:pt-6">
        <div className="min-w-0 lg:col-span-7">
          <h1 className="font-display text-[28px] font-extrabold leading-[1.05] tracking-tight lg:text-[40px] lg:leading-[1.02]">
            Les bons plans du péyi,
            <br />
            votés par le péyi.
          </h1>
          {/* Sur desktop la recherche vit dans l'en-tête, pas ici. */}
          <SoleilSearchField className="mt-3 lg:hidden" />
          <div className="mt-3.5 lg:mt-4">
            <CounterTiles dealCount={dealCount} listingCount={listingCount} />
          </div>
          <div className="mt-3.5">
            <CityChips />
          </div>
        </div>

        {featured && (
          <div className="min-w-0 lg:col-span-5">
            <DailyDeal
              deal={{
                slug: featured.slug,
                title: featured.title,
                temperature: featured.temperature,
                coverImageUrl: featured.coverImageUrl,
                source:
                  featured.store?.name ??
                  featured.merchant?.name ??
                  featured.city?.name ??
                  null,
                note: featured.expiresAt
                  ? `Expire ${formatRelativeTime(featured.expiresAt)}`
                  : (featured.city?.name ?? null),
              }}
            />
          </div>
        )}
      </div>

      {/* Listes */}
      <div className="grid grid-cols-1 gap-6 px-5 pb-4 pt-6 lg:grid-cols-12 lg:gap-9 lg:px-8">
        <div className="min-w-0 space-y-6 lg:col-span-7">
          <HotDealsList deals={hotDeals} />
          <HomeActivities
            activities={activities.map((activity) => ({
              id: activity.id,
              slug: activity.slug,
              name: activity.name,
              meta: [
                activity.city.name,
                activity.isFree
                  ? "gratuit"
                  : activity.priceMinCents != null
                    ? `dès ${euros.format(activity.priceMinCents / 100)}`
                    : null,
              ]
                .filter(Boolean)
                .join(" · "),
              coverImageUrl: activity.images[0]?.url ?? null,
            }))}
          />
        </div>
        <div className="min-w-0 space-y-6 lg:col-span-5">
          <SideListings
            listings={listings.slice(0, SIDE_LISTINGS).map((listing) => ({
              id: listing.id,
              slug: listing.slug,
              title: listing.title,
              priceLabel: formatPriceType(listing.priceType, listing.price),
              meta: `${listing.city.name} · ${formatRelativeTime(listing.publishedAt)}`,
              coverImageUrl: listing.coverImageUrl,
            }))}
          />
          <PatajBanner />
        </div>
      </div>

    </main>
  );
}
