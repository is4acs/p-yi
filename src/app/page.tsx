import type { Metadata } from "next";
import Link from "next/link";
import { Flame, Tag } from "lucide-react";

import { fetchDealsPage, fetchUserFavoriteSet, fetchUserVoteMap } from "@/lib/deals/queries";
import {
  fetchListingsPage,
  fetchUserFavoriteListingSet,
} from "@/lib/listings/queries";
import { getCurrentUser } from "@/lib/auth/current-user";

import { DealCard } from "@/components/deals/DealCard";
import { HomeCategoriesGrid } from "@/components/home/HomeCategoriesGrid";
import { HomeCommunesSection } from "@/components/home/HomeCommunesSection";
import { HomeHero } from "@/components/home/HomeHero";
import { HomePillarLinks } from "@/components/seo/HomePillarLinks";
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
const HOME_LISTINGS_COUNT = 6;

type Props = {
  searchParams?: Promise<{ deleted?: string }>;
};

export default async function HomePage(props: Props) {
  const searchParams = await props.searchParams;
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
    <main className="mx-auto w-full max-w-md overflow-x-clip pb-14 animate-in fade-in duration-300 sm:max-w-2xl lg:max-w-5xl xl:max-w-6xl">
      {searchParams?.deleted === "1" && (
        <div
          role="status"
          className="mx-4 mt-4 rounded-lg border border-peyi-green-200 bg-peyi-green-50 p-3 text-sm text-peyi-green-900 sm:mx-0"
        >
          Ton compte a bien été supprimé. Merci d&apos;avoir fait partie de
          l&apos;aventure Péyi.
        </div>
      )}
      {/* Hero S31 — refonte éditoriale alignée mockup Claude Design.
          Eyebrow guyanais, H1 avec deux `<HighlightJaune>` (bons plans
          + annonces pour signer les 2 pôles du produit), lede concret
          avec refs locales, SearchBar conservée, CTA primary + lien
          secondaire, 3 KPIs temps-réel. Cf. `HomeHero` pour détails. */}
      <HomeHero />
      {/* Entrées SEO locales : liens descriptifs crawlables vers les
          pages piliers ville/catégorie. */}
      <HomePillarLinks />
      {/* Catégories — grille 2×4 (mobile) / 4×2 (desktop), tuiles colorées */}
      <HomeCategoriesGrid />
      <div className="mt-8 lg:grid lg:grid-cols-12 lg:items-start lg:gap-8">
        {/* Deals chauds */}
        <section className="px-4 sm:px-0 lg:col-span-7">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
                <Flame className="h-5 w-5 text-hot" aria-hidden />
                Tendance en ce moment
              </h2>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                Les meilleurs deals votés par la communauté.
              </p>
            </div>
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
            // Mobile/tablette : rail horizontal snap (pattern marketplace).
            // Desktop large : on passe en grille 2 colonnes pour réduire
            // le scroll et mieux exploiter l'espace.
            (<ul
              className="-mx-4 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:grid lg:grid-cols-2 lg:gap-3 lg:overflow-visible lg:px-0 lg:pb-0"
              aria-label="Bons plans tendance"
            >
              {topDeals.map((d) => (
                <li
                  key={d.id}
                  className="w-[85vw] max-w-[340px] shrink-0 snap-start sm:w-[340px] lg:w-auto lg:max-w-none lg:shrink lg:snap-none"
                >
                  {/* variant="compact" : le rail horizontal 340px est
                      trop étroit pour la mise en page 3-col Dealabs
                      (vote | image 140 | body). On conserve l'ancienne
                      vue dense (image 96 + body + vote compact) pour la
                      home — la nouvelle vue est réservée à la liste
                      `/bons-plans` qui a la largeur `max-w-2xl`. */}
                  <DealCard
                    deal={d}
                    currentUserId={currentUser?.id ?? null}
                    myVote={voteMap.get(d.id) ?? null}
                    isFavorited={favoriteSet.has(d.id)}
                    variant="compact"
                  />
                </li>
              ))}
            </ul>)
          )}
        </section>

        {/* Petites annonces */}
        <section className="mt-10 px-4 sm:px-0 lg:col-span-5 lg:mt-0">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
                <Tag className="h-5 w-5 text-peyi-green-600" aria-hidden />
                Dernières annonces
              </h2>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                Les nouvelles publications proches de chez toi.
              </p>
            </div>
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
      </div>
      {/* Explorer par commune — entrée hyperlocale, pattern secondaire
          (après catégories + trending) pour relancer la navigation
          en bas de home avant le footer. */}
      <HomeCommunesSection />
    </main>
  );
}
