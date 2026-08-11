import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { DealStatus, type VoteType } from "@prisma/client";
import { formatPrice, formatRelativeTime } from "@/lib/format";
import { isRenderableImageUrl } from "@/lib/images";
import { rethrowIfNextInternal } from "@/lib/next-errors";
import { withTimeout } from "@/lib/async/with-timeout";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  buildBreadcrumbJsonLd,
  buildDealJsonLd,
  serializeJsonLd,
} from "@/lib/seo/json-ld";

import { AuthorControls } from "@/components/deals/AuthorControls";
import { CommentList } from "@/components/comments/CommentList";
import { ReportDialog } from "@/components/reports/ReportDialog";
import { ShareRow } from "@/components/shared/ShareRow";
import { BackHeader } from "@/components/soleil/BackHeader";
import { CountLine } from "@/components/soleil/CountLine";
import { HeartButton } from "@/components/soleil/HeartButton";
import { Ph } from "@/components/soleil/Ph";
import { VotePill } from "@/components/soleil/VotePill";
import { getSiteUrl } from "@/lib/site-url";
import { getMessages, tFormat } from "@/lib/i18n";
import {
  getDealCategoryBySlug,
  getDealsCategoryPath,
  getDealsCityPath,
  getStoreBySlug,
  getStorePath,
} from "@/lib/seo/local-pages";

// ---------- data ----------
const DETAIL_DATA_TIMEOUT_MS = 4_500;
const DETAIL_METADATA_TIMEOUT_MS = 2_500;

// Pas de `force-dynamic` : la page reste dynamique de fait (cookies via
// `getCurrentUser`) mais on cache la requête Prisma lourde (jointures
// auteur/catégorie/ville/store/merchant) via `unstable_cache` avec un
// tag par slug. Les mutations (vote/favori/commentaire/édition/admin)
// appellent `revalidateTag(\`deal:\${slug}\`)` pour invalider.

const dealDetailSelect = {
  id: true,
  slug: true,
  title: true,
  description: true,
  price: true,
  originalPrice: true,
  discountPercent: true,
  currency: true,
  isFree: true,
  externalUrl: true,
  affiliateUrl: true,
  coverImageUrl: true,
  temperature: true,
  upvotes: true,
  downvotes: true,
  commentCount: true,
  viewCount: true,
  expiresAt: true,
  updatedAt: true,
  publishedAt: true,
  images: {
    orderBy: { sortOrder: "asc" },
    select: { url: true },
  },
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
  store: {
    select: {
      name: true,
      slug: true,
      address: true,
      website: true,
      city: { select: { name: true } },
    },
  },
  merchant: { select: { name: true, slug: true, domain: true, logoUrl: true } },
} as const;

function getDeal(slug: string) {
  return unstable_cache(
    async () =>
      withTimeout(
        prisma.deal.findFirst({
          where: {
            slug,
            status: DealStatus.PUBLISHED,
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
          select: dealDetailSelect,
        }),
        DETAIL_DATA_TIMEOUT_MS,
        "deal/detail-query",
      ),
    ["deal-detail", slug],
    { tags: [`deal:${slug}`], revalidate: 3600 },
  )();
}

function getDealMeta(slug: string) {
  return unstable_cache(
    async () =>
      withTimeout(
        prisma.deal.findFirst({
          where: {
            slug,
            status: DealStatus.PUBLISHED,
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
          select: {
            title: true,
            description: true,
            slug: true,
            coverImageUrl: true,
            expiresAt: true,
            category: { select: { name: true } },
            city: { select: { name: true } },
          },
        }),
        DETAIL_METADATA_TIMEOUT_MS,
        "deal/metadata-query",
      ),
    ["deal-meta", slug],
    { tags: [`deal:${slug}`], revalidate: 3600 },
  )();
}

// ---------- SEO ----------

export async function generateMetadata(
  props: {
    params: Promise<{ slug: string }>;
  }
): Promise<Metadata> {
  const params = await props.params;
  const deal = await getDealMeta(params.slug).catch((err) => {
    // eslint-disable-next-line no-console
    console.error("[deal/metadata] load failed", { slug: params.slug, err });
    return null;
  });
  if (!deal || (deal.expiresAt && deal.expiresAt <= new Date())) {
    return {
      title: "Bon plan introuvable",
      robots: { index: false, follow: false },
    };
  }

  const description =
    deal.description?.replace(/\s+/g, " ").trim().slice(0, 160) ||
    `${deal.category.name}${deal.city ? ` à ${deal.city.name}` : ""} — bon plan partagé sur Péyi.`;
  const url = `/bons-plans/${deal.slug}`;

  // Pas d'`images` explicite : Next injecte automatiquement l'OG
  // dynamique de `opengraph-image.tsx` (cover + branding + prix).
  // Voir `src/app/bons-plans/[slug]/opengraph-image.tsx`.
  return {
    title: deal.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: deal.title,
      description,
      url,
    },
    twitter: {
      card: "summary_large_image",
      title: deal.title,
      description,
    },
  };
}

// ---------- page ----------

export default async function DealDetailPage(
  props: {
    params: Promise<{ slug: string }>;
  }
) {
  const params = await props.params;
  const t = await getMessages();
  const [dealResult, currentUserResult] = await Promise.allSettled([
    getDeal(params.slug),
    withTimeout(
      getCurrentUser(),
      DETAIL_DATA_TIMEOUT_MS,
      "deal/detail-current-user",
    ),
  ]);

  if (currentUserResult.status === "rejected") {
    rethrowIfNextInternal(currentUserResult.reason);
  }
  if (dealResult.status === "rejected") {
    rethrowIfNextInternal(dealResult.reason);
    // eslint-disable-next-line no-console
    console.error("[deal/page] load failed", { slug: params.slug, err: dealResult.reason });
    return (
      <main className="flex min-h-[60vh] flex-col items-center justify-center bg-soleil-cream px-4 py-12 text-center text-soleil-forest dark:bg-soleil-night dark:text-soleil-cream">
        <h1 className="font-display text-[22px] font-extrabold leading-[1.12]">
          Bon plan indisponible temporairement
        </h1>
        <p className="mt-3 max-w-sm text-[13px] leading-relaxed text-soleil-body dark:text-soleil-body-d">
          La fiche n&apos;a pas pu être chargée pour le moment. Réessaie dans
          quelques secondes.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Link
            href="/bons-plans"
            className="inline-flex min-h-[44px] items-center rounded-full bg-soleil-forest px-4 text-sm font-extrabold text-soleil-cream dark:bg-soleil-cream dark:text-soleil-forest"
          >
            Retour aux bons plans
          </Link>
          <Link
            href={`/bons-plans/${params.slug}`}
            className="inline-flex min-h-[44px] items-center rounded-full border-[1.5px] border-soleil-forest px-4 text-sm font-bold dark:border-soleil-cream"
          >
            Recharger
          </Link>
        </div>
      </main>
    );
  }

  const deal = dealResult.value;
  const currentUser =
    currentUserResult.status === "fulfilled" ? currentUserResult.value : null;

  if (!deal || (deal.expiresAt && deal.expiresAt <= new Date())) notFound();

  if (currentUserResult.status === "rejected") {
    // eslint-disable-next-line no-console
    console.error("[deal/page] current user load failed", {
      slug: params.slug,
      err: currentUserResult.reason,
    });
  }

  const isAuthor = currentUser?.id === deal.author.id;
  let myVote: VoteType | null = null;
  let isFavorited = false;
  if (currentUser) {
    try {
      const [vote, favorite] = await withTimeout(
        Promise.all([
          isAuthor
            ? Promise.resolve(null)
            : prisma.vote.findUnique({
                where: { userId_dealId: { userId: currentUser.id, dealId: deal.id } },
                select: { value: true },
              }),
          prisma.favorite.findUnique({
            where: { userId_dealId: { userId: currentUser.id, dealId: deal.id } },
            select: { id: true },
          }),
        ]),
        DETAIL_DATA_TIMEOUT_MS,
        "deal/detail-vote-favorite",
      );
      myVote = vote?.value ?? null;
      isFavorited = Boolean(favorite);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[deal/page] vote/favorite load failed", {
        slug: params.slug,
        userId: currentUser.id,
        err,
      });
    }
  }
  const canVote = Boolean(currentUser) && !isAuthor;
  const voteDisabledHint = !currentUser
    ? "Connecte-toi pour voter."
    : isAuthor
    ? "Tu ne peux pas voter sur ton propre bon plan."
    : undefined;
  const canFavorite = Boolean(currentUser);
  const favoriteDisabledHint = !currentUser
    ? "Connecte-toi pour sauvegarder."
    : undefined;

  const ctaUrl = deal.affiliateUrl ?? deal.externalUrl ?? deal.store?.website ?? null;
  const sellerName =
    deal.store?.name ?? deal.merchant?.name ?? "Vendeur non précisé";
  const placeholderLabel = deal.store?.name ?? deal.merchant?.name ?? deal.title;
  const expiresLabel = deal.expiresAt
    ? new Intl.DateTimeFormat("fr-FR", {
        day: "numeric",
        month: "long",
      }).format(deal.expiresAt)
    : null;
  const categoryPath = getDealCategoryBySlug(deal.category.slug)
    ? getDealsCategoryPath(deal.category.slug)
    : `/bons-plans?category=${encodeURIComponent(deal.category.slug)}`;
  const cityPath = deal.city ? getDealsCityPath(deal.city.slug) : null;
  const storePath =
    deal.store && getStoreBySlug(deal.store.slug)
      ? getStorePath(deal.store.slug)
      : null;
  const sanitizedImages = deal.images.filter((img) =>
    isRenderableImageUrl(img.url),
  );
  const dealPhotos =
    sanitizedImages.length > 0
      ? sanitizedImages
      : isRenderableImageUrl(deal.coverImageUrl)
      ? [{ url: deal.coverImageUrl }]
      : [];
  const publishedDateLabel = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
  }).format(deal.publishedAt);
  const updatedDateLabel = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
  }).format(deal.updatedAt);
  const showUpdatedAt = deal.updatedAt.getTime() - deal.publishedAt.getTime() > 60_000;

  // JSON-LD — Product + Offer pour la rich card produit, et
  // BreadcrumbList pour le fil d'ariane dans les SERPs. Tout est
  // sérialisé en une seule balise <script> pour simplifier.
  let jsonLd = "";
  try {
    jsonLd = serializeJsonLd([
      buildDealJsonLd({
        slug: deal.slug,
        title: deal.title,
        description: deal.description,
        price: deal.price,
        currency: deal.currency,
        isFree: deal.isFree,
        expiresAt: deal.expiresAt,
        publishedAt: deal.publishedAt,
        coverImageUrl: isRenderableImageUrl(deal.coverImageUrl)
          ? deal.coverImageUrl
          : null,
        category: deal.category,
        city: deal.city,
        store: deal.store ? { name: deal.store.name } : null,
        merchant: deal.merchant ? { name: deal.merchant.name } : null,
        author: { username: deal.author.username },
      }),
      buildBreadcrumbJsonLd([
        { name: "Accueil", url: "/" },
        { name: "Bons plans", url: "/bons-plans" },
        { name: "Guyane", url: "/bons-plans/guyane" },
        ...(deal.city
          ? [{ name: deal.city.name, url: getDealsCityPath(deal.city.slug) }]
          : []),
        { name: deal.category.name, url: categoryPath },
        { name: deal.title, url: `/bons-plans/${deal.slug}` },
      ]),
    ]);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[deal/page] json-ld generation failed", {
      slug: deal.slug,
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
          title={t.dealDetail.title}
          backHref="/bons-plans"
          action={
            <HeartButton
              kind="deal"
              targetId={deal.id}
              initialFavorited={isFavorited}
              canFavorite={canFavorite}
              disabledHint={favoriteDisabledHint}
            />
          }
        />

        <div className="lg:grid lg:grid-cols-12 lg:items-start lg:gap-8">
          <div className="lg:col-span-7">
            {/* Visuel + badge température posé dessus. */}
            <div className="relative mx-5 mt-3.5 h-[170px] overflow-hidden rounded-2xl lg:mx-0 lg:h-[280px]">
              {dealPhotos.length > 0 ? (
                <Image
                  src={dealPhotos[0].url}
                  alt={deal.title}
                  fill
                  unoptimized
                  priority
                  className="object-cover"
                />
              ) : (
                <Ph label={placeholderLabel} className="h-full w-full" />
              )}
              <span className="absolute left-2.5 top-2.5 rounded-full bg-soleil-orange px-2.5 py-1 font-display text-[13px] font-extrabold text-soleil-forest">
                {deal.temperature >= 0 ? "+" : ""}
                {deal.temperature}°
              </span>
            </div>

            <div className="px-5 pt-4 lg:px-0">
              <CountLine>
                {deal.category.name} ·{" "}
                {deal.store ? t.dealDetail.inStore : t.dealDetail.web}
              </CountLine>
              <h1 className="mt-1.5 font-display text-[22px] font-extrabold leading-[1.12]">
                {deal.title}
              </h1>
              <p className="mt-[5px] text-xs text-soleil-muted dark:text-soleil-muted-d">
                {tFormat(t.dealDetail.postedMeta, {
                  seller: sellerName,
                  ago: formatRelativeTime(deal.publishedAt),
                  author: deal.author.username,
                })}
              </p>

              <div className="mt-3 flex flex-wrap items-baseline gap-2.5">
                {deal.isFree ? (
                  <span className="font-display text-[34px] font-extrabold leading-none">
                    {t.common.free}
                  </span>
                ) : (
                  <>
                    <span className="font-display text-[34px] font-extrabold leading-none">
                      {formatPrice(deal.price.toString())}
                    </span>
                    {deal.originalPrice != null && (
                      <span className="text-sm text-soleil-strike line-through dark:text-soleil-strike-d">
                        {formatPrice(deal.originalPrice.toString())}
                      </span>
                    )}
                    {deal.discountPercent != null && deal.discountPercent > 0 && (
                      <span className="rounded-[7px] bg-soleil-promo px-2 py-[3px] text-[11px] font-extrabold text-soleil-otext dark:bg-soleil-promo-d dark:text-soleil-otext-d">
                        −{deal.discountPercent}%
                      </span>
                    )}
                  </>
                )}
              </div>

              <VotePill
                dealId={deal.id}
                temperature={deal.temperature}
                myVote={myVote}
                canVote={canVote}
                disabledHint={voteDisabledHint}
                className="mt-3.5"
              />

              <div className="pt-3.5">
                {ctaUrl ? (
                  <>
                    <a
                      href={ctaUrl}
                      target="_blank"
                      rel="nofollow sponsored noopener"
                      className="block rounded-full bg-soleil-forest py-3.5 text-center text-sm font-extrabold text-soleil-cream transition active:scale-[0.99] dark:bg-soleil-cream dark:text-soleil-forest"
                    >
                      {tFormat(t.dealDetail.seeDealAt, { seller: sellerName })}
                    </a>
                    <p className="mt-1.5 text-center text-[10.5px] text-soleil-muted dark:text-soleil-muted-d">
                      {t.dealDetail.noCommission}
                    </p>
                  </>
                ) : (
                  <div className="rounded-[14px] bg-soleil-sand px-4 py-3 text-[12.5px] text-soleil-body dark:bg-soleil-forest dark:text-soleil-body-d">
                    {t.dealDetail.pickupInStore}
                    {deal.store?.address ? ` · ${deal.store.address}` : ""}
                    {deal.store?.city?.name ? ` · ${deal.store.city.name}` : ""}
                  </div>
                )}
              </div>

              {deal.description && (
                <p className="mt-4 whitespace-pre-line text-[13px] leading-relaxed text-soleil-body dark:text-soleil-body-d">
                  {deal.description}
                </p>
              )}

              {/* Chips info + actions de modération. */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {expiresLabel && (
                  <span className="rounded-full border-[1.5px] border-soleil-border px-2.5 py-1 text-[11px] font-bold dark:border-soleil-border-d">
                    {tFormat(t.dealDetail.expireOn, { date: expiresLabel })}
                  </span>
                )}
                <span className="rounded-full border-[1.5px] border-soleil-border px-2.5 py-1 text-[11px] font-bold dark:border-soleil-border-d">
                  {tFormat(t.dealDetail.verifiedAgo, {
                    ago: formatRelativeTime(deal.updatedAt),
                  })}
                </span>
                {currentUser && !isAuthor && (
                  <ReportDialog
                    kind="deal"
                    targetId={deal.id}
                    title="Signaler ce bon plan"
                    variant="ghost"
                  />
                )}
              </div>

              <p className="mt-2 text-[10.5px] text-soleil-muted dark:text-soleil-muted-d">
                {t.dealDetail.publishedOn}{" "}
                <time dateTime={deal.publishedAt.toISOString()}>
                  {publishedDateLabel}
                </time>
                {showUpdatedAt && (
                  <>
                    {" "}
                    · {t.dealDetail.updatedOn}{" "}
                    <time dateTime={deal.updatedAt.toISOString()}>
                      {updatedDateLabel}
                    </time>
                  </>
                )}
              </p>

              {isAuthor && (
                <div className="mt-3">
                  <AuthorControls
                    dealId={deal.id}
                    editHref={`/bons-plans/${deal.slug}/edit`}
                  />
                </div>
              )}

              {/* Commentaires */}
              <section className="pt-5">
                <h2 className="font-display text-[17px] font-extrabold">
                  {t.dealDetail.comments}{" "}
                  <span className="text-soleil-otext dark:text-soleil-otext-d">
                    {deal.commentCount}
                  </span>
                </h2>
                <div className="mt-1">
                  <CommentList
                    dealId={deal.id}
                    dealSlug={deal.slug}
                    currentUserId={currentUser?.id ?? null}
                  />
                </div>
              </section>
            </div>
          </div>

          {/* Colonne latérale desktop : magasin, partage, maillage SEO. */}
          <aside className="px-5 lg:sticky lg:top-24 lg:col-span-5 lg:px-0 lg:pt-3.5">
            {deal.store && (
              <div className="mt-5 rounded-2xl border-[1.5px] border-soleil-border p-3 dark:border-soleil-border-d lg:mt-0">
                <p className="text-[13.5px] font-bold">{deal.store.name}</p>
                {deal.store.address && (
                  <p className="mt-0.5 text-[11.5px] text-soleil-muted dark:text-soleil-muted-d">
                    {deal.store.address}
                  </p>
                )}
                {deal.store.city?.name && (
                  <p className="text-[11.5px] text-soleil-muted dark:text-soleil-muted-d">
                    {deal.store.city.name}
                  </p>
                )}
              </div>
            )}

            <div className="mt-4">
              <ShareRow
                url={`${getSiteUrl()}/bons-plans/${deal.slug}`}
                text={`${deal.title} — ${deal.isFree ? "Gratuit" : `${deal.price}€`}`}
              />
            </div>

            <section className="mt-5">
              <h2 className="font-display text-[17px] font-extrabold">
                {t.dealDetail.seeAlso}
              </h2>
              <ul className="mt-2 space-y-2 text-[12.5px] font-bold">
                {cityPath && deal.city && (
                  <li>
                    <Link
                      href={cityPath}
                      className="text-soleil-otext dark:text-soleil-otext-d"
                    >
                      {tFormat(t.dealDetail.seeCityDeals, { city: deal.city.name })}
                    </Link>
                  </li>
                )}
                <li>
                  <Link
                    href={categoryPath}
                    className="text-soleil-otext dark:text-soleil-otext-d"
                  >
                    {tFormat(t.dealDetail.seeCategoryDeals, {
                      category: deal.category.name.toLowerCase(),
                    })}
                  </Link>
                </li>
                {storePath && deal.store && (
                  <li>
                    <Link
                      href={storePath}
                      className="text-soleil-otext dark:text-soleil-otext-d"
                    >
                      {tFormat(t.dealDetail.seeStoreDeals, { store: deal.store.name })}
                    </Link>
                  </li>
                )}
              </ul>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
