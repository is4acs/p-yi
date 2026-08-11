import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import {
  fetchDealsPage,
  fetchUserFavoriteSet,
  fetchUserVoteMap,
  PAGE_SIZE,
} from "@/lib/deals/queries";
import { parsePage, parseQuery, parseSort } from "@/lib/deals/url";
import { getCurrentUser } from "@/lib/auth/current-user";
import { DealCard } from "@/components/deals/DealCard";
import { DealsPagination } from "@/components/deals/DealsPagination";
import { EmptyDeals } from "@/components/deals/EmptyDeals";
import { Icon } from "@/components/ui/Icon";
import { CountLine } from "@/components/soleil/CountLine";
import { FilterSelect } from "@/components/soleil/FilterSelect";
import { Ph } from "@/components/soleil/Ph";
import { SearchField } from "@/components/soleil/SearchField";
import { Sun } from "@/components/soleil/Sun";
import { TabsPeyi } from "@/components/soleil/TabsPeyi";
import { formatPrice, formatRelativeTime } from "@/lib/format";
import Link from "next/link";
import { getLocale, getMessages, tFormat } from "@/lib/i18n";
import { OnboardingNudge } from "@/components/onboarding/OnboardingNudge";
import { withTimeout } from "@/lib/async/with-timeout";
import { getDealsFacetCanonicalPath } from "@/lib/seo/local-pages";

export const dynamic = "force-dynamic";
const METADATA_TIMEOUT_MS = 2_000;
const PAGE_DATA_TIMEOUT_MS = 4_500;

type SearchParams = {
  sort?: string;
  category?: string;
  city?: string;
  page?: string;
  q?: string;
};

/**
 * Resout les slugs `category` / `city` en noms humains pour enrichir
 * le titre et la description. On fait UNE seule requête (les deux
 * slugs sont uniques). Si un slug n'existe pas en DB, on retombe
 * sur le slug tel quel (évite de perdre la requête SEO si la DB et
 * l'URL divergent temporairement).
 */
async function resolveFacets(
  categorySlug: string | null,
  citySlug: string | null,
) {
  try {
    const [category, city] = await withTimeout(
      Promise.all([
        categorySlug
          ? prisma.category.findUnique({
              where: { slug: categorySlug },
              select: { name: true },
            })
          : null,
        citySlug
          ? prisma.city.findUnique({
              where: { slug: citySlug },
              select: { name: true },
            })
          : null,
      ]),
      METADATA_TIMEOUT_MS,
      "deals/metadata-facets",
    );
    return {
      categoryName: category?.name ?? categorySlug ?? null,
      cityName: city?.name ?? citySlug ?? null,
    };
  } catch (err) {
    // Pendant la génération des metadata, un crash Prisma remonte
    // jusqu'au boundary global et affiche "Quelque chose s'est
    // mal passé" à la place de la page. On retombe proprement sur
    // les slugs bruts : le titre reste lisible, la page s'affiche.
    // eslint-disable-next-line no-console
    console.error("[deals/metadata] facet resolution failed", {
      categorySlug,
      citySlug,
      err,
    });
    return {
      categoryName: categorySlug ?? null,
      cityName: citySlug ?? null,
    };
  }
}

export async function generateMetadata(
  props: {
    searchParams: Promise<SearchParams>;
  }
): Promise<Metadata> {
  const searchParams = await props.searchParams;
  const q = parseQuery(searchParams.q);
  const sort = parseSort(searchParams.sort);
  const page = parsePage(searchParams.page);
  const categorySlug = searchParams.category?.trim() || null;
  const citySlug = searchParams.city?.trim() || null;

  // Toutes les vues filtrées/recherchées (query params) passent en
  // noindex pour éviter la bloat SEO. Les pages piliers dédiées
  // (/bons-plans/guyane, /bons-plans/{ville}, /bons-plans/{cat}/guyane)
  // portent l'indexation locale.
  const hasFacet = Boolean(categorySlug || citySlug);
  const hasQueryVariant = Boolean(q) || sort !== "hot" || page > 1;
  const isFilteredView = hasFacet || hasQueryVariant;
  const facetCanonical =
    getDealsFacetCanonicalPath({ categorySlug, citySlug }) ?? "/bons-plans";

  const { categoryName, cityName } = await resolveFacets(
    categorySlug,
    citySlug,
  );

  const parts: string[] = [];
  if (categoryName) parts.push(categoryName);
  if (cityName) parts.push(cityName);

  if (parts.length > 0) {
    const label = parts.join(" · ");
    const title = `Bons plans ${label}`;
    const description = `Les bons plans ${label.toLowerCase()} partagés par la communauté en Guyane sur Péyi.`;
    return {
      title,
      description,
      alternates: { canonical: facetCanonical },
      robots: { index: !isFilteredView, follow: true },
      openGraph: { title, description, url: facetCanonical },
      twitter: { title, description, card: "summary_large_image" },
    };
  }

  const title = "Bons plans de Guyane";
  const description =
    "Les bons plans partagés par la communauté en Guyane. Partage, vote et profite des meilleures promos.";
  return {
    title,
    description,
    alternates: { canonical: "/bons-plans" },
    robots: { index: true, follow: true },
    openGraph: { title, description, url: "/bons-plans" },
    twitter: { title, description, card: "summary_large_image" },
  };
}

export default async function BonsPlansPage(
  props: {
    searchParams: Promise<SearchParams>;
  }
) {
  const searchParams = await props.searchParams;
  const t = await getMessages();
  const locale = await getLocale();
  const sort = parseSort(searchParams.sort);
  const page = parsePage(searchParams.page);
  const category = searchParams.category?.trim() || null;
  const city = searchParams.city?.trim() || null;
  const q = parseQuery(searchParams.q);

  const [dealsResult, categoriesResult, citiesResult, currentUserResult] =
    await Promise.allSettled([
      withTimeout(
        fetchDealsPage({ sort, page, category, city, q }),
        PAGE_DATA_TIMEOUT_MS,
        "deals/page-list",
      ),
      withTimeout(
        prisma.category.findMany({
          where: { type: "DEAL", isActive: true },
          orderBy: { sortOrder: "asc" },
          select: { slug: true, name: true, icon: true },
        }),
        PAGE_DATA_TIMEOUT_MS,
        "deals/page-categories",
      ),
      withTimeout(
        prisma.city.findMany({
          orderBy: { name: "asc" },
          select: { slug: true, name: true },
        }),
        PAGE_DATA_TIMEOUT_MS,
        "deals/page-cities",
      ),
      withTimeout(
        getCurrentUser(),
        PAGE_DATA_TIMEOUT_MS,
        "deals/page-current-user",
      ),
    ]);

  const dealsPayload =
    dealsResult.status === "fulfilled"
      ? dealsResult.value
      : { deals: [], total: 0 };
  const deals = dealsPayload.deals;
  const total = dealsPayload.total;

  const categories =
    categoriesResult.status === "fulfilled" ? categoriesResult.value : [];
  const cities = citiesResult.status === "fulfilled" ? citiesResult.value : [];
  const currentUser =
    currentUserResult.status === "fulfilled" ? currentUserResult.value : null;

  const hasDataLoadIssue =
    dealsResult.status === "rejected" ||
    categoriesResult.status === "rejected" ||
    citiesResult.status === "rejected" ||
    currentUserResult.status === "rejected";

  if (hasDataLoadIssue) {
    // eslint-disable-next-line no-console
    console.error("[deals/page] partial data load failure", {
      deals: dealsResult.status === "rejected" ? dealsResult.reason : undefined,
      categories:
        categoriesResult.status === "rejected"
          ? categoriesResult.reason
          : undefined,
      cities: citiesResult.status === "rejected" ? citiesResult.reason : undefined,
      currentUser:
        currentUserResult.status === "rejected"
          ? currentUserResult.reason
          : undefined,
    });
  }

  const dealIds = deals.map((d) => d.id);
  let voteMap = new Map<string, import("@prisma/client").VoteType>();
  let favoriteSet = new Set<string>();
  try {
    [voteMap, favoriteSet] = await Promise.all([
      withTimeout(
        fetchUserVoteMap(currentUser?.id ?? null, dealIds),
        PAGE_DATA_TIMEOUT_MS,
        "deals/page-votes",
      ),
      withTimeout(
        fetchUserFavoriteSet(currentUser?.id ?? null, dealIds),
        PAGE_DATA_TIMEOUT_MS,
        "deals/page-favorites",
      ),
    ]);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[deals/page] vote/favorite load failed", err);
  }

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = Boolean(category || city || q);

  // Onboarding steps (user connecté uniquement, page non filtrée).
  // Chaque étape est pilotée par un champ que l'utilisateur peut
  // remplir lui-même — pas de logique serveur cachée. Les liens
  // pointent vers la page exacte où compléter.
  let onboardingSteps: Array<{
    key: string;
    label: string;
    href: string;
    done: boolean;
  }> = [];
  if (currentUser && !hasFilters) {
    try {
      const [publishedDealCount, publishedListingCount] = await withTimeout(
        Promise.all([
          prisma.deal.count({
            where: { authorId: currentUser.id, status: "PUBLISHED" },
          }),
          prisma.listing.count({
            where: { authorId: currentUser.id, status: "PUBLISHED" },
          }),
        ]),
        PAGE_DATA_TIMEOUT_MS,
        "deals/page-onboarding-counts",
      );
      onboardingSteps = [
        {
          key: "avatar",
          label: "Ajoute une photo de profil",
          href: "/profil/edit",
          done: Boolean(currentUser.avatarUrl),
        },
        {
          key: "city",
          label: "Renseigne ta commune",
          href: "/profil/edit",
          done: Boolean(currentUser.cityId),
        },
        {
          key: "first-post",
          label: "Publie ton premier contenu (bon plan ou annonce)",
          href: "/poster",
          done: publishedDealCount + publishedListingCount > 0,
        },
      ];
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[deals/page] onboarding counts load failed", {
        userId: currentUser.id,
        err,
      });
    }
  }

  const cityName = city
    ? cities.find((c) => c.slug === city)?.name ?? city
    : null;
  const dealOfTheDay = !hasFilters && page === 1 ? deals[0] ?? null : null;

  return (
    <main className="min-h-screen bg-soleil-cream text-soleil-forest animate-in fade-in duration-300 dark:bg-soleil-night dark:text-soleil-cream">
      <h1 className="sr-only">{t.deals.title}</h1>
      <div className="mx-auto w-full max-w-md px-5 pb-12 lg:max-w-6xl lg:px-8">
        {/* Header wordmark + pilule ville (mobile-first, maquette 4a). */}
        <div className="flex items-end justify-between pt-4 lg:hidden">
          <Link href="/" className="flex items-end gap-2" aria-label={t.nav.home}>
            <Sun w={20} />
            <span className="font-display text-[23px] font-extrabold leading-[0.9] tracking-[-0.5px]">
              péyi
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="rounded-full border-[1.5px] border-soleil-forest px-3 py-1.5 text-xs font-bold dark:border-soleil-cream">
              {cityName ?? "Guyane"}
            </span>
            {currentUser ? (
              <Link
                href="/profil"
                aria-label={t.home.myProfile}
                className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-soleil-forest text-[11.5px] font-extrabold text-soleil-cream dark:bg-soleil-cream dark:text-soleil-forest"
              >
                {currentUser.username.trim().slice(0, 2).toUpperCase()}
              </Link>
            ) : (
              <Link
                href="/connexion"
                aria-label={t.home.myProfile}
                className="flex h-[34px] w-[34px] items-center justify-center rounded-full border-[1.5px] border-soleil-forest dark:border-soleil-cream"
              >
                <Icon name="user" size={15} />
              </Link>
            )}
          </div>
        </div>

        <TabsPeyi active="deals" className="pt-3" />

        <SearchField
          placeholder={t.deals.searchPlaceholder}
          action="/bons-plans"
          defaultValue={q ?? ""}
          hidden={{
            ...(sort !== "hot" ? { sort } : {}),
            ...(category ? { category } : {}),
            ...(city ? { city } : {}),
          }}
          className="mt-3.5"
        />

        {/* Filtres en chips : tri + catégorie + ville. Auto-submit au
            changement, bouton sr-only pour le fallback sans JS. */}
        <form action="/bons-plans" method="get" className="pt-3">
          {q && <input type="hidden" name="q" value={q} />}
          <div className="scrollbar-hide -mx-5 flex gap-2 overflow-x-auto px-5">
            <FilterSelect
              name="sort"
              options={[
                { value: "hot", label: t.deals.sortHot },
                { value: "new", label: t.deals.sortNew },
                { value: "top-week", label: t.deals.sortTopWeek },
              ]}
              defaultValue={sort}
              alwaysActive
            />
            <FilterSelect
              name="category"
              placeholder={t.common.category}
              options={categories.map((c) => ({ value: c.slug, label: c.name }))}
              defaultValue={category ?? ""}
            />
            <FilterSelect
              name="city"
              placeholder={t.common.city}
              options={cities.map((c) => ({ value: c.slug, label: c.name }))}
              defaultValue={city ?? ""}
            />
          </div>
          <button type="submit" className="sr-only focus:not-sr-only focus:mt-2 focus:inline-flex focus:min-h-[36px] focus:items-center focus:rounded-full focus:border-[1.5px] focus:border-soleil-forest focus:px-3 focus:text-xs focus:font-bold dark:focus:border-soleil-cream">
            {t.common.filter}
          </button>
        </form>

        {onboardingSteps.length > 0 && (
          <OnboardingNudge steps={onboardingSteps} />
        )}

        {hasDataLoadIssue && (
          <div
            role="status"
            className="mt-3 rounded-[14px] bg-soleil-sand px-3 py-2 text-xs text-soleil-body dark:bg-soleil-forest dark:text-soleil-body-d"
          >
            {t.common.loadIssue}
          </div>
        )}

        <div className="lg:grid lg:grid-cols-12 lg:items-start lg:gap-8">
          <div className="lg:col-span-7">
            <CountLine className="pb-0.5 pt-3.5">
              {tFormat(t.deals.count, { n: total, place: cityName ?? "Guyane" })}
            </CountLine>

            {deals.length === 0 ? (
              <div className="pt-4">
                <EmptyDeals hasFilters={hasFilters} />
              </div>
            ) : (
              <ul>
                {deals.map((d) => (
                  <li
                    key={d.id}
                    className="border-b border-soleil-line last:border-0 dark:border-soleil-line-d"
                  >
                    <DealCard
                      deal={d}
                      currentUserId={currentUser?.id ?? null}
                      myVote={voteMap.get(d.id) ?? null}
                      isFavorited={favoriteSet.has(d.id)}
                      variant="soleil"
                    />
                  </li>
                ))}
              </ul>
            )}

            <DealsPagination
              page={page}
              pageCount={pageCount}
              sort={sort}
              category={category}
              city={city}
              q={q}
            />
          </div>

          {/* Colonne latérale desktop : deal du jour (1er deal du tri
              « plus chauds », vue non filtrée uniquement). */}
          {dealOfTheDay && (
            <aside className="hidden lg:col-span-5 lg:block">
              <div className="sticky top-24 pt-3.5">
                <CountLine className="pb-2.5">{t.home.dealOfDay}</CountLine>
                <div className="rounded-[20px] bg-soleil-forest p-[18px] text-soleil-cream dark:bg-soleil-cream dark:text-soleil-forest">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-soleil-orange px-3 py-1 font-display text-sm font-extrabold text-soleil-forest">
                      {dealOfTheDay.temperature >= 0 ? "+" : ""}
                      {dealOfTheDay.temperature}°
                    </span>
                    <span className="text-xs font-semibold text-soleil-muted-d dark:text-soleil-muted">
                      {dealOfTheDay.store?.name ??
                        dealOfTheDay.merchant?.name ??
                        t.dealDetail.web}
                    </span>
                  </div>
                  <div className="mt-3 font-display text-2xl font-extrabold leading-[1.1]">
                    {dealOfTheDay.title}
                  </div>
                  <div className="mt-1.5 text-xs text-soleil-muted-d dark:text-soleil-muted">
                    {dealOfTheDay.isFree
                      ? t.common.free
                      : formatPrice(dealOfTheDay.price.toString())}
                    {" · "}
                    {formatRelativeTime(dealOfTheDay.publishedAt, locale)}
                  </div>
                  <Ph label="visuel" className="mt-3 h-[84px] rounded-xl" />
                  <Link
                    href={`/bons-plans/${dealOfTheDay.slug}`}
                    className="mt-3 block rounded-full bg-soleil-cream py-3 text-center text-[13px] font-extrabold text-soleil-forest dark:bg-soleil-forest dark:text-soleil-cream"
                  >
                    {t.home.seeDeal}
                  </Link>
                </div>
              </div>
            </aside>
          )}
        </div>

      </div>
    </main>
  );
}
