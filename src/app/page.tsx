import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

import { prisma } from "@/lib/prisma";
import { fetchDealsPage } from "@/lib/deals/queries";
import { fetchListingsPage, formatPriceType } from "@/lib/listings/queries";
import { getCurrentUser } from "@/lib/auth/current-user";
import { formatPrice, formatRelativeTime } from "@/lib/format";
import { isRenderableImageUrl } from "@/lib/images";
import { withTimeout } from "@/lib/async/with-timeout";

import { HomePillarLinks } from "@/components/seo/HomePillarLinks";
import { CountLine } from "@/components/soleil/CountLine";
import { FilterChips } from "@/components/soleil/FilterChips";
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

function activityPriceLabel(activity: {
  isFree: boolean;
  priceMinCents: number | null;
}): string | null {
  if (activity.isFree) return "gratuit";
  if (activity.priceMinCents != null) {
    return `dès ${Math.round(activity.priceMinCents / 100)} €`;
  }
  return null;
}

export default async function HomePage(props: Props) {
  const searchParams = await props.searchParams;
  const [dealsPayload, listingsPayload, currentUser] = await Promise.all([
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

  const { deals, total: dealsTotal } = dealsPayload;
  const { listings, total: listingsTotal } = listingsPayload;

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
    // eslint-disable-next-line no-console
    console.error("[home] activities load failed", err);
  }

  const dealOfTheDaySeller = dealOfTheDay
    ? dealOfTheDay.store?.name ?? dealOfTheDay.merchant?.name ?? "Web"
    : null;

  return (
    <main className="min-h-screen bg-soleil-cream pb-14 text-soleil-forest animate-in fade-in duration-300 dark:bg-soleil-night dark:text-soleil-cream">
      <div className="mx-auto w-full max-w-md px-5 lg:max-w-6xl lg:px-8">
        {/* Header wordmark mobile (le Header global prend le relais en lg). */}
        <div className="flex items-center justify-between pt-4 lg:hidden">
          <Link href="/" className="flex items-end gap-2" aria-label="Accueil Péyi">
            <Sun w={22} />
            <span className="font-display text-[25px] font-extrabold leading-[0.9] tracking-[-0.5px]">
              péyi
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="rounded-full border-[1.5px] border-soleil-forest px-3 py-1.5 text-xs font-bold dark:border-soleil-cream">
              Guyane
            </span>
            {currentUser ? (
              <Link
                href="/profil"
                aria-label="Mon profil"
                className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-soleil-forest text-[11.5px] font-extrabold text-soleil-cream dark:bg-soleil-cream dark:text-soleil-forest"
              >
                {currentUser.username.trim().slice(0, 2).toUpperCase()}
              </Link>
            ) : (
              <Link
                href="/connexion"
                className="rounded-full bg-soleil-forest px-3 py-1.5 text-xs font-extrabold text-soleil-cream dark:bg-soleil-cream dark:text-soleil-forest"
              >
                Connexion
              </Link>
            )}
          </div>
        </div>

        {searchParams?.deleted === "1" && (
          <div
            role="status"
            className="mt-4 rounded-[14px] bg-soleil-valid p-3 text-sm font-semibold text-soleil-forest dark:bg-soleil-valid-d"
          >
            Ton compte a bien été supprimé. Merci d&apos;avoir fait partie de
            l&apos;aventure Péyi.
          </div>
        )}

        {/* Héros : titre, recherche (mobile), double compteur, communes |
            deal du jour à droite en lg. */}
        <div className="lg:grid lg:grid-cols-12 lg:items-start lg:gap-9 lg:pt-6">
          <div className="lg:col-span-7">
            <h1 className="pt-[18px] font-display text-[28px] font-extrabold leading-[1.05] tracking-[-0.6px] lg:pt-0 lg:text-[40px] lg:leading-[1.02] lg:tracking-[-1px]">
              Les bons plans du péyi,
              <br />
              votés par le péyi.
            </h1>

            <SearchField
              placeholder="Chercher… riz, pirogue, billet Paris"
              action="/recherche"
              className="mt-3 lg:hidden"
            />

            {/* Double compteur — les deux pôles du produit à égalité. */}
            <div className="mt-3.5 grid grid-cols-2 gap-2.5 lg:max-w-[460px] lg:gap-3">
              <Link
                href="/bons-plans"
                className="rounded-2xl border-[1.5px] border-soleil-forest p-3 transition active:scale-[0.99] dark:border-soleil-cream"
              >
                <div className="font-display text-[21px] font-extrabold lg:text-[23px]">
                  {dealsTotal}
                </div>
                <div className="mt-px text-[11.5px] font-bold">
                  Bons plans{" "}
                  <span className="text-soleil-otext dark:text-soleil-otext-d">
                    →
                  </span>
                </div>
                <div className="mt-0.5 text-[10.5px] text-soleil-muted dark:text-soleil-muted-d">
                  votés par la commu
                </div>
              </Link>
              <Link
                href="/annonces"
                className="rounded-2xl border-[1.5px] border-soleil-border p-3 transition active:scale-[0.99] dark:border-soleil-border-d"
              >
                <div className="font-display text-[21px] font-extrabold lg:text-[23px]">
                  {listingsTotal}
                </div>
                <div className="mt-px text-[11.5px] font-bold">
                  Annonces{" "}
                  <span className="text-soleil-otext dark:text-soleil-otext-d">
                    →
                  </span>
                </div>
                <div className="mt-0.5 text-[10.5px] text-soleil-muted dark:text-soleil-muted-d">
                  près de chez toi
                </div>
              </Link>
            </div>

            {/* Communes — liens crawlables vers les pages piliers. */}
            <FilterChips
              className="pt-3.5"
              chips={[
                { label: "Toute la Guyane", href: "/bons-plans/guyane", active: true },
                ...COMMUNE_CHIPS.map((c) => ({
                  label: c.label,
                  href: `/bons-plans/${c.slug}`,
                })),
              ]}
            />
          </div>

          {/* Le deal du jour — carte forêt (inversée crème en nuit). */}
          {dealOfTheDay && (
            <aside className="pt-5 lg:col-span-5 lg:pt-0">
              <CountLine className="pb-2.5">Le deal du jour</CountLine>
              <div className="rounded-[20px] bg-soleil-forest p-[18px] text-soleil-cream dark:bg-soleil-cream dark:text-soleil-forest">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-soleil-orange px-3 py-1 font-display text-sm font-extrabold text-soleil-forest">
                    {dealOfTheDay.temperature >= 0 ? "+" : ""}
                    {dealOfTheDay.temperature}°
                  </span>
                  <span className="text-xs font-semibold text-soleil-muted-d dark:text-soleil-muted">
                    {dealOfTheDaySeller}
                  </span>
                </div>
                <div className="mt-3 font-display text-2xl font-extrabold leading-[1.1]">
                  {dealOfTheDay.title}
                </div>
                <div className="mt-1.5 text-xs text-soleil-muted-d dark:text-soleil-muted">
                  {dealOfTheDay.isFree
                    ? "Gratuit"
                    : formatPrice(dealOfTheDay.price.toString())}
                  {" · "}
                  {formatRelativeTime(dealOfTheDay.publishedAt)}
                </div>
                {isRenderableImageUrl(dealOfTheDay.coverImageUrl) ? (
                  <div className="relative mt-3 h-[84px] overflow-hidden rounded-xl">
                    <Image
                      src={dealOfTheDay.coverImageUrl}
                      alt=""
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <Ph label="visuel" className="mt-3 h-[84px] rounded-xl" />
                )}
                <Link
                  href={`/bons-plans/${dealOfTheDay.slug}`}
                  className="mt-3 block rounded-full bg-soleil-cream py-3 text-center text-[13px] font-extrabold text-soleil-forest transition active:scale-[0.99] dark:bg-soleil-forest dark:text-soleil-cream"
                >
                  Voir le deal →
                </Link>
              </div>
            </aside>
          )}
        </div>

        <div className="lg:grid lg:grid-cols-12 lg:items-start lg:gap-9">
          {/* Ça chauffe cette semaine — liste éditoriale numérotée. */}
          <section className="pt-6 lg:col-span-7">
            <SectionHead
              title="Ça chauffe cette semaine"
              href="/bons-plans"
              linkLabel="Tout voir"
            />
            {hotDeals.length === 0 ? (
              <p className="rounded-[14px] bg-soleil-sand p-4 pt-3.5 text-[12.5px] text-soleil-body dark:bg-soleil-forest dark:text-soleil-body-d">
                Les prochains bons plans votés par la communauté s&apos;affichent
                ici.
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
                        <span className="block text-sm font-bold leading-[1.25]">
                          {deal.title}
                          <span className="text-soleil-otext dark:text-soleil-otext-d">
                            {" "}
                            ·{" "}
                            {deal.isFree
                              ? "Gratuit"
                              : formatPrice(deal.price.toString())}
                          </span>
                        </span>
                        <span className="mt-[3px] block text-[11px] text-soleil-muted dark:text-soleil-muted-d">
                          {[
                            deal.store?.name ?? deal.merchant?.name,
                            deal.city?.name,
                            formatRelativeTime(deal.publishedAt),
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
                    À faire ce week-end : {activities[0].name}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-soleil-muted dark:text-soleil-muted-d">
                    {[
                      activities[0].city.name,
                      activityPriceLabel(activities[0]),
                      "validé Péyi",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                <span className="flex-none text-xs font-bold text-soleil-otext dark:text-soleil-otext-d">
                  Activités →
                </span>
              </Link>
            )}
          </section>

          {/* Côté annonces — grille photo-first + tuile « Dépose ». */}
          <section className="pt-6 lg:col-span-5">
            <SectionHead
              title="Côté annonces"
              href="/annonces"
              linkLabel="Tout voir"
            />
            <div className="mt-3 grid grid-cols-2 gap-3">
              {homeListings.map((listing) => (
                <Link
                  key={listing.id}
                  href={`/annonces/${listing.slug}`}
                  className="transition active:scale-[0.99]"
                >
                  <div className="relative h-[118px] overflow-hidden rounded-[14px] lg:h-[104px]">
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
                      {formatPriceType(listing.priceType, listing.price)}
                    </PriceTag>
                  </div>
                  <div className="mt-1.5 line-clamp-1 text-[12.5px] font-bold">
                    {listing.title}
                  </div>
                  <div className="text-[11px] text-soleil-muted dark:text-soleil-muted-d">
                    {listing.city.name}
                  </div>
                </Link>
              ))}
              <Link
                href="/poster/annonce"
                className="flex min-h-[118px] flex-col items-center justify-center gap-1.5 rounded-[14px] border-[1.5px] border-dashed border-soleil-border transition active:scale-[0.99] dark:border-soleil-border-d lg:min-h-[104px]"
              >
                <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-soleil-forest text-soleil-orange dark:bg-soleil-cream dark:text-soleil-forest">
                  <Icon name="plus" size={15} />
                </span>
                <span className="text-center text-[11.5px] font-bold leading-[1.3]">
                  Dépose ton
                  <br />
                  annonce
                </span>
              </Link>
            </div>
          </section>
        </div>

        {/* À faire dans le péyi — liste mobile (teaser desktop plus haut). */}
        {activities.length > 0 && (
          <section className="pt-6 lg:hidden">
            <SectionHead
              title="À faire dans le péyi"
              href="/activites"
              linkLabel="Activités"
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
                        {[activity.city.name, activityPriceLabel(activity)]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    <span className="flex flex-none items-center gap-1 rounded-full bg-soleil-valid px-2 py-1 text-[10.5px] font-extrabold text-soleil-forest dark:bg-soleil-valid-d">
                      <Icon name="check" size={10} />
                      Validé
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Entrées SEO locales : liens crawlables ville/catégorie. */}
        <div className="pt-6">
          <HomePillarLinks />
        </div>

        {/* Bannière « Pataj to bon plan ! » — la seule exception hex
            tolérée : le sous-texte #5C3413 sur l'aplat orange. */}
        <div className="relative mt-5 overflow-hidden rounded-[20px] bg-soleil-orange p-5">
          <span
            aria-hidden
            className="absolute -right-6 -top-6 h-[100px] w-[100px] rounded-full bg-soleil-cream/25"
          />
          <div className="font-display text-[21px] font-extrabold leading-[1.05] text-soleil-forest">
            Pataj to bon plan !
          </div>
          <div className="mt-1 text-[12.5px] font-medium text-[#5C3413]">
            Gratuit, en 2 minutes. Le péyi te dira merci.
          </div>
          <Link
            href="/poster/bon-plan"
            className="mt-3 inline-block rounded-full bg-soleil-forest px-[17px] py-2.5 text-[12.5px] font-extrabold text-soleil-cream transition active:scale-[0.98]"
          >
            Poster un deal +
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
            Péyi — fait en Guyane
          </span>
        </div>
      </div>
    </main>
  );
}
