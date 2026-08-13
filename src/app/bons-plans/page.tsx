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
import { firstParam } from "@/lib/url-params";
import { buildFacetMetadata } from "@/lib/seo/facet-metadata";
import { DealCard } from "@/components/deals/DealCard";
import { DealsPagination } from "@/components/deals/DealsPagination";
import { EmptyDeals } from "@/components/deals/EmptyDeals";
import { CountLine } from "@/components/soleil/CountLine";
import { FilterSelect } from "@/components/soleil/FilterSelect";
import { Ph } from "@/components/soleil/Ph";
import { SearchField } from "@/components/soleil/SearchField";
import { MobileHeader } from "@/components/soleil/MobileHeader";
import { TabsPeyi } from "@/components/soleil/TabsPeyi";
import { formatPrice, formatRelativeTime } from "@/lib/format";
import Link from "next/link";
import { getLocale, getMessages, tFormat } from "@/lib/i18n";
import { OnboardingNudge } from "@/components/onboarding/OnboardingNudge";
import { withTimeout } from "@/lib/async/with-timeout";
import { getDealsFacetCanonicalPath } from "@/lib/seo/local-pages";

export const dynamic = "force-dynamic";
const PAGE_DATA_TIMEOUT_MS = 4_500;

// Chaque valeur peut être un TABLEAU si le paramètre est répété dans
// l'URL — lecture uniquement via `firstParam`.
type SearchParams = Record<string, string | string[] | undefined>;

export async function generateMetadata(
  props: {
    searchParams: Promise<SearchParams>;
  }
): Promise<Metadata> {
  const searchParams = await props.searchParams;
  const q = parseQuery(firstParam(searchParams.q));
  const sort = parseSort(firstParam(searchParams.sort));
  const page = parsePage(firstParam(searchParams.page));
  const categorySlug = firstParam(searchParams.category)?.trim() || null;
  const citySlug = firstParam(searchParams.city)?.trim() || null;

  const hasFacet = Boolean(categorySlug || citySlug);
  const hasQueryVariant = Boolean(q) || sort !== "hot" || page > 1;

  return buildFacetMetadata({
    categorySlug,
    citySlug,
    isFilteredView: hasFacet || hasQueryVariant,
    facetCanonical:
      getDealsFacetCanonicalPath({ categorySlug, citySlug }) ?? "/bons-plans",
    basePath: "/bons-plans",
    titlePrefix: "Bons plans",
    facetDescription: (label) =>
      `Les bons plans ${label} partagés par la communauté en Guyane sur Péyi.`,
    defaultTitle: "Bons plans de Guyane",
    defaultDescription:
      "Les bons plans partagés par la communauté en Guyane. Partage, vote et profite des meilleures promos.",
    logLabel: "deals",
  });
}

export default async function BonsPlansPage(
  props: {
    searchParams: Promise<SearchParams>;
  }
) {
  const searchParams = await props.searchParams;
  const t = await getMessages();
  const locale = await getLocale();
  const sort = parseSort(firstParam(searchParams.sort));
  const page = parsePage(firstParam(searchParams.page));
  const category = firstParam(searchParams.category)?.trim() || null;
  const city = firstParam(searchParams.city)?.trim() || null;
  const q = parseQuery(firstParam(searchParams.q));

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
        <MobileHeader
          user={currentUser}
          t={t}
          right={
            <span className="rounded-full border-[1.5px] border-soleil-forest px-3 py-1.5 text-xs font-bold dark:border-soleil-cream">
              {cityName ?? "Guyane"}
            </span>
          }
        />

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
