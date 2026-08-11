import Link from "next/link";
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { ListingStatus } from "@prisma/client";
import { formatRelativeTime } from "@/lib/format";
import { LEVEL_META } from "@/lib/deals/user-level";
import { getCurrentUser } from "@/lib/auth/current-user";
import { isRenderableImageUrl } from "@/lib/images";
import { rethrowIfNextInternal } from "@/lib/next-errors";
import { withTimeout } from "@/lib/async/with-timeout";
import {
  CONDITION_LABEL,
  formatPriceType,
  TYPE_LABEL,
} from "@/lib/listings/queries";
import { summarizeAttributesForCard } from "@/lib/listings/field-registry";
import {
  buildBreadcrumbJsonLd,
  buildListingJsonLd,
  serializeJsonLd,
} from "@/lib/seo/json-ld";

import { ListingGallery } from "@/components/listings/ListingGallery";
import { ListingAuthorControls } from "@/components/listings/ListingAuthorControls";
import { ContactSellerForm } from "@/components/messages/ContactSellerForm";
import { ReportDialog } from "@/components/reports/ReportDialog";
import { ShareRow } from "@/components/shared/ShareRow";
import { BackHeader } from "@/components/soleil/BackHeader";
import { ConseilPeyi } from "@/components/soleil/ConseilPeyi";
import { HeartButton } from "@/components/soleil/HeartButton";
import { Ph } from "@/components/soleil/Ph";
import { getSiteUrl } from "@/lib/site-url";
import { getLocale, getMessages, tFormat } from "@/lib/i18n";
import { translateUserTexts } from "@/lib/i18n/translate";
import {
  getListingCategoryBySlug,
  getListingsCategoryPath,
  getListingsCityPath,
} from "@/lib/seo/local-pages";

// Pas de `force-dynamic` : la page reste dynamique de fait (cookies via
// `getCurrentUser`) mais on cache la requête Prisma lourde (jointures
// auteur/ville/catégorie/images) via `unstable_cache` avec un tag par
// slug. Mutations (favori/édition/message/admin) appellent
// `revalidateTag(\`listing:\${slug}\`)` pour invalider.
const DETAIL_DATA_TIMEOUT_MS = 4_500;
const DETAIL_METADATA_TIMEOUT_MS = 2_500;

const listingDetailSelect = {
  id: true,
  slug: true,
  title: true,
  description: true,
  price: true,
  priceType: true,
  currency: true,
  type: true,
  condition: true,
  coverImageUrl: true,
  attributes: true,
  neighborhood: true,
  contactPhone: true,
  showPhone: true,
  allowMessages: true,
  status: true,
  publishedAt: true,
  updatedAt: true,
  bumpedAt: true,
  expiresAt: true,
  viewCount: true,
  favoriteCount: true,
  contactCount: true,
  isBoosted: true,
  isUrgent: true,
  isFeatured: true,
  author: {
    select: {
      id: true,
      username: true,
      fullName: true,
      avatarUrl: true,
      karma: true,
      level: true,
      city: { select: { name: true } },
    },
  },
  city: { select: { name: true, slug: true } },
  category: { select: { name: true, slug: true, icon: true } },
  images: {
    orderBy: { sortOrder: "asc" },
    select: { url: true },
  },
} as const;

function getListing(slug: string) {
  return unstable_cache(
    async () =>
      withTimeout(
        prisma.listing.findFirst({
          where: {
            slug,
            status: ListingStatus.PUBLISHED,
            expiresAt: { gt: new Date() },
          },
          select: listingDetailSelect,
        }),
        DETAIL_DATA_TIMEOUT_MS,
        "listing/detail-query",
      ),
    ["listing-detail", slug],
    { tags: [`listing:${slug}`], revalidate: 3600 },
  )();
}

function getListingMeta(slug: string) {
  return unstable_cache(
    async () =>
      withTimeout(
        prisma.listing.findFirst({
          where: {
            slug,
            status: ListingStatus.PUBLISHED,
            expiresAt: { gt: new Date() },
          },
          select: {
            title: true,
            description: true,
            slug: true,
            coverImageUrl: true,
            price: true,
            priceType: true,
            expiresAt: true,
            category: { select: { name: true } },
            city: { select: { name: true } },
          },
        }),
        DETAIL_METADATA_TIMEOUT_MS,
        "listing/metadata-query",
      ),
    ["listing-meta", slug],
    { tags: [`listing:${slug}`], revalidate: 3600 },
  )();
}

export async function generateMetadata(
  props: {
    params: Promise<{ slug: string }>;
  }
): Promise<Metadata> {
  const params = await props.params;
  const listing = await getListingMeta(params.slug).catch((err) => {
    // Un crash Prisma pendant la phase metadata remonte au
    // boundary et affiche la page d'erreur générique. On renvoie
    // un fallback indexable-noindex pour que la requête ne meure
    // pas silencieusement.
    // eslint-disable-next-line no-console
    console.error("[listing/metadata] load failed", {
      slug: params.slug,
      err,
    });
    return null;
  });
  if (!listing || listing.expiresAt <= new Date()) {
    return {
      title: "Annonce introuvable",
      robots: { index: false, follow: false },
    };
  }

  // Préfixer la description par le prix améliore l'aperçu social (WhatsApp,
  // iMessage, Slack affichent 2-3 lignes) — l'info la plus utile est
  // toujours "combien ça coûte et où ça se trouve".
  const priceLabel = formatPriceType(listing.priceType, listing.price);
  const trimmed = listing.description.replace(/\s+/g, " ").trim();
  const locationTag = `${listing.category.name} · ${listing.city.name}`;
  const rawDescription = trimmed
    ? `${priceLabel} · ${locationTag} — ${trimmed}`
    : `${priceLabel} · ${locationTag} — annonce sur Péyi.`;
  const description = rawDescription.slice(0, 160);

  const url = `/annonces/${listing.slug}`;

  // Pas d'`images` explicite : Next injecte l'OG dynamique généré
  // par `opengraph-image.tsx` (cover + prix + branding Péyi).
  return {
    title: listing.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: listing.title,
      description,
      url,
    },
    twitter: {
      card: "summary_large_image",
      title: listing.title,
      description,
    },
  };
}

export default async function ListingDetailPage(
  props: {
    params: Promise<{ slug: string }>;
  }
) {
  const params = await props.params;
  const t = await getMessages();
  const locale = await getLocale();
  // `Promise.allSettled` plutôt que `Promise.all` : si la requête
  // user (Supabase auth) hiccup, on veut quand même afficher
  // l'annonce en mode "déconnecté" plutôt que crasher toute la
  // page. Même logique que côté bons-plans après S34.
  const [listingResult, currentUserResult] = await Promise.allSettled([
    getListing(params.slug),
    withTimeout(
      getCurrentUser(),
      DETAIL_DATA_TIMEOUT_MS,
      "listing/detail-current-user",
    ),
  ]);

  // Si Next jette une sentinelle (DYNAMIC_SERVER_USAGE depuis cookies(),
  // NEXT_REDIRECT, NEXT_NOT_FOUND…), on ne doit JAMAIS l'avaler — sinon
  // on casse le contrôle de flux serveur. Voir `lib/next-errors.ts`.
  if (currentUserResult.status === "rejected") {
    rethrowIfNextInternal(currentUserResult.reason);
  }
  if (listingResult.status === "rejected") {
    rethrowIfNextInternal(listingResult.reason);
    // eslint-disable-next-line no-console
    console.error("[listing/page] load failed", {
      slug: params.slug,
      err: listingResult.reason,
    });
    return (
      <main className="flex min-h-[60vh] flex-col items-center justify-center bg-soleil-cream px-4 py-12 text-center text-soleil-forest dark:bg-soleil-night dark:text-soleil-cream">
        <h1 className="font-display text-[22px] font-extrabold leading-[1.12]">
          Annonce indisponible temporairement
        </h1>
        <p className="mt-3 max-w-sm text-[13px] leading-relaxed text-soleil-body dark:text-soleil-body-d">
          La fiche n&apos;a pas pu être chargée pour le moment. Réessaie dans
          quelques secondes.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Link
            href="/annonces"
            className="inline-flex min-h-[44px] items-center rounded-full bg-soleil-forest px-4 text-sm font-extrabold text-soleil-cream dark:bg-soleil-cream dark:text-soleil-forest"
          >
            Retour aux annonces
          </Link>
          <Link
            href={`/annonces/${params.slug}`}
            className="inline-flex min-h-[44px] items-center rounded-full border-[1.5px] border-soleil-forest px-4 text-sm font-bold dark:border-soleil-cream"
          >
            Recharger
          </Link>
        </div>
      </main>
    );
  }

  const listing = listingResult.value;
  const currentUser =
    currentUserResult.status === "fulfilled" ? currentUserResult.value : null;

  if (!listing || listing.expiresAt <= new Date()) notFound();

  // Traduction automatique du contenu de l'annonce vers la langue de
  // l'interface (passthrough sans fournisseur configuré). Le SEO garde
  // les textes originaux.
  const [mtTitle, mtDescription] = await translateUserTexts(
    [listing.title, listing.description],
    locale,
  );
  const contentTranslated = mtTitle.translated || mtDescription.translated;

  if (currentUserResult.status === "rejected") {
    // eslint-disable-next-line no-console
    console.error("[listing/page] current user load failed", {
      slug: params.slug,
      err: currentUserResult.reason,
    });
  }

  const isAuthor = currentUser?.id === listing.author.id;
  let isFavorited = false;
  if (currentUser && !isAuthor) {
    try {
      const fav = await withTimeout(
        prisma.favorite.findUnique({
          where: {
            userId_listingId: {
              userId: currentUser.id,
              listingId: listing.id,
            },
          },
          select: { id: true },
        }),
        DETAIL_DATA_TIMEOUT_MS,
        "listing/detail-favorite",
      );
      isFavorited = Boolean(fav);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[listing/page] favorite load failed", {
        slug: params.slug,
        userId: currentUser.id,
        err,
      });
    }
  }

  const canFavorite = Boolean(currentUser) && !isAuthor;
  const favoriteHint = !currentUser
    ? "Connecte-toi pour sauvegarder."
    : isAuthor
    ? "C'est ton annonce."
    : undefined;

  const priceLabel = formatPriceType(listing.priceType, listing.price);
  // Fallback BEGINNER si la DB a un niveau supprimé du code (migration
  // d'enum partielle).
  const level = LEVEL_META[listing.author.level] ?? LEVEL_META.BEGINNER;
  const locationLabel = listing.neighborhood
    ? `${listing.city.name} · ${listing.neighborhood}`
    : listing.city.name;
  // Chips caractéristiques : résumé des attributs enregistrés pour la
  // catégorie (ex. « 74 000 km · 2019 · Diesel ») + état + type non-défaut.
  const attributeChips = [
    ...(summarizeAttributesForCard(listing.category.slug, listing.attributes)
      ?.split(" · ")
      .filter(Boolean) ?? []),
    ...(listing.condition ? [CONDITION_LABEL[listing.condition]] : []),
    ...(listing.type !== "OFFER" ? [TYPE_LABEL[listing.type]] : []),
  ];
  const cityPath = getListingsCityPath(listing.city.slug);
  const categoryPath = getListingCategoryBySlug(listing.category.slug)
    ? getListingsCategoryPath(listing.category.slug)
    : `/annonces?category=${encodeURIComponent(listing.category.slug)}`;
  const publishedDateLabel = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
  }).format(listing.publishedAt);
  const updatedDateLabel = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
  }).format(listing.updatedAt);
  const showUpdatedAt = listing.updatedAt.getTime() - listing.publishedAt.getTime() > 60_000;

  // Images filtrées : `<Image>` crash au render si on lui passe une URL
  // vide ou malformée (common quand un ancien upload a laissé une
  // string vide en DB). On filtre avant pour que la page ne casse
  // jamais à cause d'une ligne pourrie côté stockage.
  const sanitizedImages = listing.images.filter((img) =>
    isRenderableImageUrl(img.url),
  );
  const safeCoverImageUrl = isRenderableImageUrl(listing.coverImageUrl)
    ? listing.coverImageUrl
    : null;

  // JSON-LD : Product + Offer + BreadcrumbList. On injecte au début du
  // `<main>` pour que le crawler le trouve vite. Un bug de génération
  // (ex. champ inattendu à null) ne doit pas bloquer la page elle-même
  // — on enveloppe donc la construction dans un try/catch.
  let jsonLd = "";
  try {
    jsonLd = serializeJsonLd(
      [
        buildListingJsonLd({
          slug: listing.slug,
          title: listing.title,
          description: listing.description,
          price: listing.price,
          currency: listing.currency,
          priceType: listing.priceType,
          listingType: listing.type,
          condition: listing.condition,
          coverImageUrl: safeCoverImageUrl,
          images: sanitizedImages,
          category: {
            name: listing.category.name,
            slug: listing.category.slug,
          },
          city: { name: listing.city.name },
          author: { username: listing.author.username },
          publishedAt: listing.publishedAt,
        }),
        buildBreadcrumbJsonLd([
          { name: "Accueil", url: "/" },
          { name: "Annonces", url: "/annonces" },
          { name: "Guyane", url: "/annonces/guyane" },
          { name: listing.city.name, url: cityPath },
          {
            name: listing.category.name,
            url: categoryPath,
          },
          { name: listing.title, url: `/annonces/${listing.slug}` },
        ]),
      ].filter((node): node is Record<string, unknown> => Boolean(node)),
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[listing/page] json-ld generation failed", {
      slug: listing.slug,
      err,
    });
  }

  return (
    <main className="min-h-screen bg-soleil-cream pb-16 text-soleil-forest animate-in fade-in duration-300 dark:bg-soleil-night dark:text-soleil-cream">
      {jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd }}
        />
      ) : null}

      <div className="mx-auto w-full max-w-md lg:max-w-6xl lg:px-8">
        <BackHeader
          title={t.listingDetail.title}
          backHref="/annonces"
          action={
            <HeartButton
              kind="listing"
              targetId={listing.id}
              initialFavorited={isFavorited}
              canFavorite={canFavorite}
              disabledHint={favoriteHint}
            />
          }
        />

        <div className="lg:grid lg:grid-cols-12 lg:items-start lg:gap-8">
          <div className="lg:col-span-7">
            {/* Galerie multi-photos (dots + lightbox) ; fallback cover
                puis placeholder hachuré. URLs déjà validées par
                `isRenderableImageUrl`. */}
            <div className="relative mx-5 mt-3.5 lg:mx-0">
              {sanitizedImages.length > 0 ? (
                <ListingGallery
                  photos={sanitizedImages}
                  title={listing.title}
                />
              ) : safeCoverImageUrl ? (
                <ListingGallery
                  photos={[{ url: safeCoverImageUrl }]}
                  title={listing.title}
                />
              ) : (
                <Ph
                  label={listing.category.name}
                  className="h-[190px] w-full rounded-2xl"
                />
              )}
              {listing.isUrgent && (
                <span className="absolute left-2.5 top-2.5 rounded-full bg-soleil-orange px-2.5 py-1 font-display text-[11px] font-extrabold uppercase text-soleil-forest">
                  {t.listingDetail.urgent}
                </span>
              )}
            </div>

            <div className="px-5 pt-4 lg:px-0">
              <p className="font-display text-[30px] font-extrabold leading-none">
                {priceLabel}
              </p>
              <h1 className="mt-1.5 text-base font-bold">{mtTitle.text}</h1>
              <p className="mt-1 text-[11.5px] text-soleil-muted dark:text-soleil-muted-d">
                {locationLabel} ·{" "}
                {formatRelativeTime(listing.bumpedAt ?? listing.publishedAt)} ·{" "}
                {tFormat(t.listingDetail.views, {
                  n: listing.viewCount.toLocaleString("fr-FR"),
                })}
              </p>

              {attributeChips.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {attributeChips.map((chip) => (
                    <span
                      key={chip}
                      className="rounded-full border-[1.5px] border-soleil-border px-2.5 py-1 text-[11px] font-bold dark:border-soleil-border-d"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              )}

              <p className="mt-3 whitespace-pre-line text-[13px] leading-relaxed text-soleil-body dark:text-soleil-body-d">
                {mtDescription.text}
              </p>

              {contentTranslated && (
                <details className="mt-2 text-xs text-soleil-muted dark:text-soleil-muted-d">
                  <summary className="cursor-pointer font-semibold">
                    {t.mt.translated} · {t.mt.seeOriginal}
                  </summary>
                  <div className="mt-2 space-y-1.5">
                    <p className="font-bold">{listing.title}</p>
                    <p className="whitespace-pre-line leading-relaxed">
                      {listing.description}
                    </p>
                  </div>
                </details>
              )}

              <p className="mt-3 text-[10.5px] text-soleil-muted dark:text-soleil-muted-d">
                {t.listingDetail.publishedOn}{" "}
                <time dateTime={listing.publishedAt.toISOString()}>
                  {publishedDateLabel}
                </time>
                {showUpdatedAt && (
                  <>
                    {" "}
                    · {t.listingDetail.updatedOn}{" "}
                    <time dateTime={listing.updatedAt.toISOString()}>
                      {updatedDateLabel}
                    </time>
                  </>
                )}{" "}
                · {tFormat(t.listingDetail.expires, {
                  ago: formatRelativeTime(listing.expiresAt),
                })}
              </p>
            </div>
          </div>

          <div className="px-5 lg:sticky lg:top-24 lg:col-span-5 lg:px-0 lg:pt-3.5">
            {/* Carte vendeur — memberSince/note absents du modèle : on
                affiche le niveau + karma réels à la place. */}
            <div className="mt-4 flex items-center gap-3 rounded-2xl border-[1.5px] border-soleil-border p-3 dark:border-soleil-border-d lg:mt-0">
              <span
                aria-hidden
                className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-soleil-forest text-sm font-extrabold text-soleil-cream dark:bg-soleil-cream dark:text-soleil-forest"
              >
                {listing.author.username.trim()[0]?.toUpperCase() ?? "?"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-bold">
                  {listing.author.fullName ?? listing.author.username}
                </p>
                <p className="mt-0.5 text-[11px] text-soleil-muted dark:text-soleil-muted-d">
                  {level.label} ·{" "}
                  {listing.author.karma.toLocaleString("fr-FR")}{" "}
                  {t.listingDetail.karma}
                  {listing.author.city?.name
                    ? ` · ${listing.author.city.name}`
                    : ""}
                </p>
              </div>
            </div>

            {/* CTA contact : Message plein / Appeler bordé. */}
            {!isAuthor && (
              <div className="pt-3.5">
                <div className="flex gap-2.5">
                  {listing.allowMessages && currentUser && (
                    <div className="min-w-0 flex-1">
                      <ContactSellerForm
                        recipientUsername={listing.author.username}
                        listingSlug={listing.slug}
                      />
                    </div>
                  )}
                  {listing.allowMessages && !currentUser && (
                    <Link
                      href={`/connexion?next=/annonces/${listing.slug}`}
                      className="flex-1 rounded-full bg-soleil-forest py-3 text-center text-[13.5px] font-extrabold text-soleil-cream transition active:scale-[0.98] dark:bg-soleil-cream dark:text-soleil-forest"
                    >
                      {t.listingDetail.message}
                    </Link>
                  )}
                  {listing.showPhone && listing.contactPhone && (
                    <a
                      href={`tel:${listing.contactPhone}`}
                      className="flex-1 rounded-full border-[1.5px] border-soleil-forest py-3 text-center text-[13.5px] font-extrabold transition active:scale-[0.98] dark:border-soleil-cream"
                    >
                      {t.listingDetail.call}
                    </a>
                  )}
                </div>
                {currentUser && (
                  <div className="flex justify-end pt-1">
                    <ReportDialog
                      kind="listing"
                      targetId={listing.id}
                      title="Signaler cette annonce"
                      variant="ghost"
                    />
                  </div>
                )}
              </div>
            )}

            {isAuthor && (
              <div className="pt-3.5">
                <ListingAuthorControls
                  listingId={listing.id}
                  editHref={`/annonces/${listing.slug}/edit`}
                />
              </div>
            )}

            <ConseilPeyi className="mt-4">{t.listingDetail.advice}</ConseilPeyi>

            <div className="mt-4">
              <ShareRow
                url={`${getSiteUrl()}/annonces/${listing.slug}`}
                text={`${listing.title}${listing.price ? ` — ${listing.price}€` : ""}`}
              />
            </div>

            <section className="mt-5">
              <h2 className="font-display text-[17px] font-extrabold">
                {t.listingDetail.seeAlso}
              </h2>
              <ul className="mt-2 space-y-2 text-[12.5px] font-bold">
                <li>
                  <Link
                    href={cityPath}
                    className="text-soleil-otext dark:text-soleil-otext-d"
                  >
                    {tFormat(t.listingDetail.seeCityListings, {
                      city: listing.city.name,
                    })}
                  </Link>
                </li>
                <li>
                  <Link
                    href={categoryPath}
                    className="text-soleil-otext dark:text-soleil-otext-d"
                  >
                    {tFormat(t.listingDetail.seeCategoryListings, {
                      category: listing.category.name.toLowerCase(),
                    })}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/annonces/guyane"
                    className="text-soleil-otext dark:text-soleil-otext-d"
                  >
                    {t.listingDetail.seeAllListings}
                  </Link>
                </li>
              </ul>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
