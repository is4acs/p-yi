import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { LogIn } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { fetchDealsPage } from "@/lib/deals/queries";
import { fetchListingsPage, formatPriceType } from "@/lib/listings/queries";
import { getCurrentUser } from "@/lib/auth/current-user";
import { formatPrice, formatRelativeTime } from "@/lib/format";
import { isRenderableImageUrl } from "@/lib/images";
import { withTimeout } from "@/lib/async/with-timeout";
import { rethrowIfNextInternal } from "@/lib/next-errors";
import { cn } from "@/lib/utils";
import { getLocale, getMessages, tFormat, type Messages } from "@/lib/i18n";

import { CountLine } from "@/components/soleil/CountLine";
import { FilterChips } from "@/components/soleil/FilterChips";
import { LanguageSwitcher } from "@/components/soleil/LanguageSwitcher";
import { Icon } from "@/components/ui/Icon";
import { Ph } from "@/components/soleil/Ph";
import { PriceTag } from "@/components/soleil/PriceTag";
import { SearchField } from "@/components/soleil/SearchField";
import { SectionHead } from "@/components/soleil/SectionHead";
import { Sun } from "@/components/soleil/Sun";
import { TempBadge } from "@/components/soleil/TempBadge";

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

const ACTIVITIES_TIMEOUT_MS = 3_000;
const HOME_DATA_TIMEOUT_MS = 4_500;

/** Communes des pages piliers — mêmes slugs que /bons-plans/{ville}. */
const COMMUNE_CHIPS = [
  { label: "Cayenne", slug: "cayenne" },
  { label: "Kourou", slug: "kourou" },
  { label: "Matoury", slug: "matoury" },
  { label: "Rémire-Montjoly", slug: "remire-montjoly" },
  { label: "St-Laurent", slug: "saint-laurent-du-maroni" },
];

type Props = {
  searchParams?: Promise<{ deleted?: string }>;
};

function activityPriceLabel(
  activity: { isFree: boolean; priceMinCents: number | null },
  t: Messages,
): string | null {
  if (activity.isFree) return t.home.freeLower;
  if (activity.priceMinCents != null) {
    return tFormat(t.home.from, { n: Math.round(activity.priceMinCents / 100) });
  }
  return null;
}

export default async function HomePage(props: Props) {
  const searchParams = await props.searchParams;
  const t = await getMessages();
  const locale = await getLocale();
  const [dealsResult, listingsResult, userResult] = await Promise.allSettled([
    withTimeout(
      fetchDealsPage({ sort: "hot", page: 1, category: null, city: null, q: null }),
      HOME_DATA_TIMEOUT_MS,
      "home/deals",
    ),
    withTimeout(
      fetchListingsPage({
        sort: "new", page: 1, category: null, city: null, type: null, q: null,
      }),
      HOME_DATA_TIMEOUT_MS,
      "home/listings",
    ),
    withTimeout(getCurrentUser(), HOME_DATA_TIMEOUT_MS, "home/user"),
  ]);

  for (const [label, result] of [
    ["deals", dealsResult], ["listings", listingsResult], ["user", userResult],
  ] as const) {
    if (result.status === "rejected") {
      rethrowIfNextInternal(result.reason);
      // eslint-disable-next-line no-console
      console.error(`[home/${label}] load failed`, result.reason);
    }
  }
  const deals = dealsResult.status === "fulfilled" ? dealsResult.value.deals : [];
  const listings = listingsResult.status === "fulfilled" ? listingsResult.value.listings : [];
  const dealsTotal = dealsResult.status === "fulfilled" ? dealsResult.value.total : null;
  const listingsTotal = listingsResult.status === "fulfilled" ? listingsResult.value.total : null;
  const currentUser = userResult.status === "fulfilled" ? userResult.value : null;

  const dealOfTheDay = deals[0] ?? null;
  const hotDeals = deals.slice(1, 4);
  const homeListings = listings.slice(0, 3);

  // « À faire dans le péyi » — 2 fiches publiées, mises en avant d'abord.
  // Fail-soft : la home ne doit pas tomber si la table activités hoquette.
  let activities: {
    slug: string;
    name: string;
    isFree: boolean;
    priceMinCents: number | null;
    city: { name: string };
    images: { url: string }[];
  }[] = [];
  try {
    activities = await withTimeout(
      prisma.activity.findMany({
        where: { status: "PUBLISHED" },
        orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
        take: 2,
        select: {
          slug: true,
          name: true,
          isFree: true,
          priceMinCents: true,
          city: { select: { name: true } },
          images: {
            orderBy: { sortOrder: "asc" },
            take: 1,
            select: { url: true },
          },
        },
      }),
      ACTIVITIES_TIMEOUT_MS,
      "home/activities",
    );
  } catch (err) {
    rethrowIfNextInternal(err);
    // eslint-disable-next-line no-console
    console.error("[home] activities load failed", err);
  }

  const dealOfTheDaySeller = dealOfTheDay
    ? dealOfTheDay.store?.name ?? dealOfTheDay.merchant?.name ?? "Web"
    : null;

  return (
    <main className="min-h-screen bg-soleil-cream pb-14 text-soleil-forest animate-in fade-in duration-300 dark:bg-soleil-night dark:text-soleil-cream">
      <div className="mx-auto w-full max-w-md px-4 sm:max-w-3xl sm:px-6 lg:max-w-6xl lg:px-8">
        {/* Header wordmark mobile (le Header global prend le relais en lg). */}
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-3 pt-4 lg:hidden">
          <Link href="/" className="flex min-h-11 shrink-0 items-center gap-1.5" aria-label={t.nav.home}>
            <Sun w={22} />
            <span className="font-display text-[23px] font-extrabold leading-[0.9] tracking-[-0.5px]">
              péyi
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            {currentUser ? (
              <Link
                href="/profil"
                aria-label={t.home.myProfile}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-soleil-forest text-xs font-extrabold text-soleil-cream dark:bg-soleil-cream dark:text-soleil-forest"
              >
                {currentUser.username.trim().slice(0, 2).toUpperCase()}
              </Link>
            ) : (
              <Link
                href="/connexion"
                aria-label={t.home.connection}
                className="flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-full bg-soleil-forest px-3 text-xs font-extrabold text-soleil-cream dark:bg-soleil-cream dark:text-soleil-forest"
              >
                <LogIn className="h-4 w-4" aria-hidden />
                <span className="hidden min-[400px]:inline">{t.home.connection}</span>
              </Link>
            )}
          </div>
        </div>

        {searchParams?.deleted === "1" && (
          <div
            role="status"
            className="mt-4 rounded-[14px] bg-soleil-valid p-3 text-sm font-semibold text-soleil-forest dark:bg-soleil-valid-d"
          >
            {t.home.deletedAccount}
          </div>
        )}

        {/* Héros : titre, recherche, double compteur, communes |
            deal du jour à droite en lg. */}
        <div className="pt-6 sm:pt-8 lg:grid lg:grid-cols-12 lg:items-center lg:gap-10 lg:pt-10">
          <div className={cn("min-w-0", dealOfTheDay ? "lg:col-span-7" : "lg:col-span-10")}>
            <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-soleil-muted dark:text-soleil-muted-d">
              <Sun w={16} />
              {t.home.allGuyane}
            </p>
            <h1 className="font-display text-[clamp(1.75rem,6vw,3rem)] font-extrabold leading-[1.08] tracking-[-0.8px] [text-wrap:balance]">
              {t.home.heroL1}
              <br />
              {t.home.heroL2}
            </h1>

            <SearchField
              placeholder={t.home.searchPlaceholder}
              submitLabel={t.common.search}
              action="/recherche"
              className="mt-5 max-w-xl"
            />

            {/* Double compteur — les deux pôles du produit à égalité. */}
            <div className="mt-5 grid max-w-xl grid-cols-2 gap-3">
              <Link
                href="/bons-plans"
                className="min-w-0 rounded-2xl border-[1.5px] border-soleil-forest bg-soleil-sand/50 p-4 transition-colors hover:bg-soleil-sand dark:border-soleil-cream dark:bg-soleil-forest/50 dark:hover:bg-soleil-forest"
              >
                <div className="font-display text-[21px] font-extrabold lg:text-[23px]">
                  {dealsTotal === null ? "—" : dealsTotal.toLocaleString(locale)}
                </div>
                <div className="mt-px text-sm font-bold">
                  {t.home.dealsCard}{" "}
                  <span className="text-soleil-otext dark:text-soleil-otext-d">
                    →
                  </span>
                </div>
                <div className="mt-1 text-xs leading-relaxed text-soleil-muted dark:text-soleil-muted-d">
                  {t.home.dealsCardSub}
                </div>
              </Link>
              <Link
                href="/annonces"
                className="min-w-0 rounded-2xl border-[1.5px] border-soleil-border p-4 transition-colors hover:bg-soleil-sand dark:border-soleil-border-d dark:hover:bg-soleil-forest"
              >
                <div className="font-display text-[21px] font-extrabold lg:text-[23px]">
                  {listingsTotal === null ? "—" : listingsTotal.toLocaleString(locale)}
                </div>
                <div className="mt-px text-sm font-bold">
                  {t.home.listingsCard}{" "}
                  <span className="text-soleil-otext dark:text-soleil-otext-d">
                    →
                  </span>
                </div>
                <div className="mt-1 text-xs leading-relaxed text-soleil-muted dark:text-soleil-muted-d">
                  {t.home.listingsCardSub}
                </div>
              </Link>
            </div>

            {/* Communes — liens crawlables vers les pages piliers. */}
            <FilterChips
              className="pt-3.5"
              chips={[
                { label: t.home.allGuyane, href: "/bons-plans/guyane" },
                ...COMMUNE_CHIPS.map((c) => ({
                  label: c.label,
                  href: `/bons-plans/${c.slug}`,
                })),
              ]}
            />
          </div>

          {/* Le deal du jour — carte forêt (inversée crème en nuit). */}
          {dealOfTheDay && (
            <aside className="min-w-0 pt-6 lg:col-span-5 lg:pt-0">
              <CountLine className="pb-2.5">{t.home.dealOfDay}</CountLine>
              <div className="rounded-[20px] bg-soleil-forest p-[18px] text-soleil-cream dark:bg-soleil-cream dark:text-soleil-forest">
                <div className="flex items-center justify-between gap-3">
                  <span className="shrink-0 rounded-full bg-soleil-orange px-3 py-1 font-display text-sm font-extrabold text-soleil-forest">
                    {dealOfTheDay.temperature >= 0 ? "+" : ""}
                    {dealOfTheDay.temperature}°
                  </span>
                  <span className="min-w-0 text-right text-xs font-semibold text-soleil-muted-d [overflow-wrap:anywhere] dark:text-soleil-muted">
                    {dealOfTheDaySeller}
                  </span>
                </div>
                <h2 className="mt-3 font-display text-2xl font-extrabold leading-[1.15] [overflow-wrap:anywhere]">
                  {dealOfTheDay.title}
                </h2>
                <div className="mt-1.5 text-xs text-soleil-muted-d dark:text-soleil-muted">
                  {dealOfTheDay.isFree
                    ? t.common.free
                    : formatPrice(dealOfTheDay.price.toString())}
                  {" · "}
                  {formatRelativeTime(dealOfTheDay.publishedAt, locale)}
                </div>
                {isRenderableImageUrl(dealOfTheDay.coverImageUrl) ? (
                  <div className="relative mt-4 aspect-[16/7] overflow-hidden rounded-xl bg-white">
                    <Image
                      src={dealOfTheDay.coverImageUrl}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 400px, (min-width: 640px) 660px, 90vw"
                      unoptimized
                      className="object-contain p-2"
                    />
                  </div>
                ) : (
                  <Ph className="mt-4 aspect-[16/7] rounded-xl" />
                )}
                <Link
                  href={`/bons-plans/${dealOfTheDay.slug}`}
                  className="mt-3 block rounded-full bg-soleil-cream py-3 text-center text-[13px] font-extrabold text-soleil-forest transition active:scale-[0.99] dark:bg-soleil-forest dark:text-soleil-cream"
                >
                  {t.home.seeDeal}
                </Link>
              </div>
            </aside>
          )}
        </div>

        <div className="mt-2 lg:grid lg:grid-cols-12 lg:items-start lg:gap-10">
          {/* Ça chauffe cette semaine — liste éditoriale numérotée. */}
          <section className="min-w-0 pt-6 lg:col-span-7">
            <SectionHead
              title={t.home.hotWeek}
              href="/bons-plans"
              linkLabel={t.common.seeAll}
            />
            {hotDeals.length === 0 ? (
              <p role="status" className="rounded-[14px] bg-soleil-sand p-4 pt-3.5 text-sm text-soleil-body dark:bg-soleil-forest dark:text-soleil-body-d">
                {dealsResult.status === "rejected" ? t.common.loadIssue : t.home.hotWeekEmpty}
              </p>
            ) : (
              <ul>
                {hotDeals.map((deal, i) => (
                  <li
                    key={deal.id}
                    className="border-b border-soleil-line last:border-0 dark:border-soleil-line-d"
                  >
                    <Link
                      href={`/bons-plans/${deal.slug}`}
                      className="flex items-center gap-3.5 py-3.5 transition active:scale-[0.99]"
                    >
                      <span
                        aria-hidden
                        className="w-[30px] flex-none font-display text-xl font-extrabold text-soleil-orange"
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold leading-snug [overflow-wrap:anywhere]">
                          {deal.title}
                          <span className="text-soleil-otext dark:text-soleil-otext-d">
                            {" "}
                            ·{" "}
                            {deal.isFree
                              ? t.common.free
                              : formatPrice(deal.price.toString())}
                          </span>
                        </span>
                        <span className="mt-[3px] block text-xs text-soleil-muted [overflow-wrap:anywhere] dark:text-soleil-muted-d">
                          {[
                            deal.store?.name ?? deal.merchant?.name,
                            deal.city?.name,
                            formatRelativeTime(deal.publishedAt, locale),
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </span>
                      <TempBadge temperature={deal.temperature} size={44} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {/* Teaser activités (desktop) — la liste complète vit en mobile
                plus bas. */}
            {activities[0] && (
              <Link
                href={`/activites/${activities[0].slug}`}
                className="mt-2.5 hidden items-center gap-3 rounded-2xl border-[1.5px] border-soleil-border p-3 transition active:scale-[0.99] dark:border-soleil-border-d lg:flex"
              >
                {isRenderableImageUrl(activities[0].images[0]?.url) ? (
                  <div className="relative h-11 w-11 flex-none overflow-hidden rounded-xl">
                    <Image
                      src={activities[0].images[0].url}
                      alt=""
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <Ph className="h-11 w-11 flex-none rounded-xl" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-bold">
                    {tFormat(t.home.weekendTeaser, { name: activities[0].name })}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-soleil-muted dark:text-soleil-muted-d">
                    {[
                      activities[0].city.name,
                      activityPriceLabel(activities[0], t),
                      t.home.validatedPeyi,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                <span className="flex-none text-xs font-bold text-soleil-otext dark:text-soleil-otext-d">
                  {t.home.activitiesArrow}
                </span>
              </Link>
            )}
          </section>

          {/* Côté annonces — grille photo-first + tuile « Dépose ». */}
          <section className="min-w-0 pt-6 lg:col-span-5">
            <SectionHead
              title={t.home.listingsSide}
              href="/annonces"
              linkLabel={t.common.seeAll}
            />
            {listingsResult.status === "rejected" && (
              <p role="status" className="mt-2 text-sm text-soleil-muted dark:text-soleil-muted-d">{t.common.loadIssue}</p>
            )}
            <div className="mt-3 grid grid-cols-2 gap-4">
              {homeListings.map((listing) => (
                <Link
                  key={listing.id}
                  href={`/annonces/${listing.slug}`}
                  className="group min-w-0 rounded-2xl transition-colors hover:bg-soleil-sand/50 dark:hover:bg-soleil-forest/50"
                >
                  <div className="relative aspect-[4/3] overflow-hidden rounded-[14px]">
                    {isRenderableImageUrl(listing.coverImageUrl) ? (
                      <Image
                        src={listing.coverImageUrl}
                        alt={listing.title}
                        fill
                        sizes="(max-width: 1024px) 50vw, 20vw"
                        unoptimized
                        className="object-cover"
                      />
                    ) : (
                      <Ph
                        label={listing.category.name}
                        className="h-full w-full"
                      />
                    )}
                    <PriceTag>
                      {formatPriceType(listing.priceType, listing.price, locale)}
                    </PriceTag>
                  </div>
                  <div className="mt-2 line-clamp-2 text-sm font-bold leading-snug [overflow-wrap:anywhere] group-hover:underline group-hover:underline-offset-4">
                    {listing.title}
                  </div>
                  <div className="mt-1 text-xs text-soleil-muted dark:text-soleil-muted-d">
                    {listing.city.name}
                  </div>
                </Link>
              ))}
              <Link
                href="/poster/annonce"
                className="flex min-h-36 min-w-0 flex-col items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-dashed border-soleil-border bg-soleil-sand/30 p-4 transition-colors hover:bg-soleil-sand dark:border-soleil-border-d dark:bg-soleil-forest/30 dark:hover:bg-soleil-forest"
              >
                <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-soleil-forest text-soleil-orange dark:bg-soleil-cream dark:text-soleil-forest">
                  <Icon name="plus" size={15} />
                </span>
                <span className="text-center text-[11.5px] font-bold leading-[1.3]">
                  {t.home.dropListing1}
                  <br />
                  {t.home.dropListing2}
                </span>
              </Link>
            </div>
          </section>
        </div>

        {/* À faire dans le péyi — liste mobile (teaser desktop plus haut). */}
        {activities.length > 0 && (
          <section className="pt-6 lg:hidden">
            <SectionHead
              title={t.home.todo}
              href="/activites"
              linkLabel={t.home.activities}
            />
            <ul>
              {activities.map((activity) => (
                <li
                  key={activity.slug}
                  className="border-b border-soleil-line last:border-0 dark:border-soleil-line-d"
                >
                  <Link
                    href={`/activites/${activity.slug}`}
                    className="flex items-center gap-3 py-3 transition active:scale-[0.99]"
                  >
                    {isRenderableImageUrl(activity.images[0]?.url) ? (
                      <div className="relative h-[50px] w-[50px] flex-none overflow-hidden rounded-xl">
                        <Image
                          src={activity.images[0].url}
                          alt=""
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <Ph className="h-[50px] w-[50px] flex-none rounded-xl" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13.5px] font-bold">
                        {activity.name}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-soleil-muted dark:text-soleil-muted-d">
                        {[activity.city.name, activityPriceLabel(activity, t)]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    <span className="flex flex-none items-center gap-1 rounded-full bg-soleil-valid px-2 py-1 text-[10.5px] font-extrabold text-soleil-forest dark:bg-soleil-valid-d">
                      <Icon name="check" size={10} />
                      {t.home.validated}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}


        {/* Bannière « Pataj to bon plan ! » — la seule exception hex
            tolérée : le sous-texte #5C3413 sur l'aplat orange. */}
        <div className="relative mt-8 overflow-hidden rounded-[20px] bg-soleil-orange p-5 sm:p-7">
          <span
            aria-hidden
            className="pointer-events-none absolute -right-6 -top-6 h-[100px] w-[100px] rounded-full bg-soleil-cream/25"
          />
          <div className="font-display text-[21px] font-extrabold leading-[1.05] text-soleil-forest">
            {t.home.bannerTitle}
          </div>
          <div className="mt-1 text-[12.5px] font-medium text-[#5C3413]">
            {t.home.bannerSub}
          </div>
          <Link
            href="/poster/bon-plan"
            className="relative mt-4 inline-flex min-h-11 items-center rounded-full bg-soleil-forest px-5 py-3 text-sm font-extrabold text-soleil-cream transition hover:bg-soleil-forest/90"
          >
            {t.home.bannerCta}
          </Link>
        </div>

        {/* Signature — communes en lg, marque centrée en mobile. */}
        <div className="mt-5 flex items-center justify-center gap-2 border-t border-soleil-line pt-4 text-[11.5px] text-soleil-muted dark:border-soleil-line-d dark:text-soleil-muted-d lg:justify-between">
          <span className="hidden text-[11px] lg:block">
            Cayenne · Kourou · Matoury · Rémire-Montjoly ·
            Saint-Laurent-du-Maroni · Macouria
          </span>
          <span className="flex items-center gap-2">
            <Sun w={14} />
            {t.home.madeIn}
          </span>
        </div>
      </div>
    </main>
  );
}
