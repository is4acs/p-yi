import Link from "next/link";
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import type { Metadata } from "next";
import {
  ArrowLeft,
  MessageSquare,
  Eye,
  Flame,
  Snowflake,
  Clock,
  ExternalLink,
  MapPin,
  Store as StoreIcon,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import { DealStatus, type VoteType } from "@prisma/client";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/format";
import { LEVEL_META } from "@/lib/deals/user-level";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  buildBreadcrumbJsonLd,
  buildDealJsonLd,
  serializeJsonLd,
} from "@/lib/seo/json-ld";

import { Button } from "@/components/ui/button";
import { PriceTag } from "@/components/deals/PriceTag";
import { TemperatureBadge } from "@/components/deals/TemperatureBadge";
import { CategoryChip } from "@/components/deals/CategoryChip";
import { CommuneChip } from "@/components/deals/CommuneChip";
import { DealImagePlaceholder } from "@/components/deals/DealImagePlaceholder";
import { AuthorControls } from "@/components/deals/AuthorControls";
import { VoteButtons } from "@/components/deals/VoteButtons";
import { FavoriteButton } from "@/components/deals/FavoriteButton";
import { CommentList } from "@/components/comments/CommentList";
import { ReportDialog } from "@/components/reports/ReportDialog";
import { ShareRow } from "@/components/shared/ShareRow";
import { ListingGallery } from "@/components/listings/ListingGallery";
import { getSiteUrl } from "@/lib/site-url";
import {
  getDealCategoryBySlug,
  getDealsCategoryPath,
  getDealsCityPath,
  getStoreBySlug,
  getStorePath,
} from "@/lib/seo/local-pages";

// ---------- data ----------

function isRenderableImageUrl(value: string | null | undefined): value is string {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  // `next/image` accepte les URLs absolues (http/https) et les paths
  // locaux commençant par `/`.
  if (trimmed.startsWith("/")) {
    return !trimmed.startsWith("//") && !/\s/.test(trimmed);
  }
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const parsed = new URL(trimmed);
      return (
        (parsed.protocol === "http:" || parsed.protocol === "https:") &&
        !/\s/.test(trimmed)
      );
    } catch {
      return false;
    }
  }
  return false;
}

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
      prisma.deal.findFirst({
        where: {
          slug,
          status: DealStatus.PUBLISHED,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        select: dealDetailSelect,
      }),
    ["deal-detail", slug],
    { tags: [`deal:${slug}`], revalidate: 3600 },
  )();
}

function getDealMeta(slug: string) {
  return unstable_cache(
    async () =>
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
  const [dealResult, currentUserResult] = await Promise.allSettled([
    getDeal(params.slug),
    getCurrentUser(),
  ]);

  if (dealResult.status === "rejected") {
    // eslint-disable-next-line no-console
    console.error("[deal/page] load failed", { slug: params.slug, err: dealResult.reason });
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-12 text-center sm:max-w-2xl">
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Bon plan indisponible temporairement
        </h1>
        <p className="mt-3 max-w-sm text-sm text-muted-foreground sm:text-base">
          La fiche n&apos;a pas pu être chargée pour le moment. Réessaie dans
          quelques secondes.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Link
            href="/bons-plans"
            className="inline-flex h-10 items-center rounded-full bg-peyi-orange-500 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-peyi-orange-600"
          >
            Retour aux bons plans
          </Link>
          <Link
            href={`/bons-plans/${params.slug}`}
            className="inline-flex h-10 items-center rounded-full border border-border bg-background px-4 text-sm font-semibold text-foreground transition hover:border-peyi-orange-300"
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
      const [vote, favorite] = await Promise.all([
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
      ]);
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
  const level = LEVEL_META[deal.author.level] ?? LEVEL_META.BEGINNER;
  const placeholderEmoji = deal.category.icon ?? null;
  const placeholderLabel = deal.store?.name ?? deal.merchant?.name ?? deal.title;
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
    <main className="mx-auto max-w-md pb-16 animate-in fade-in duration-300 sm:max-w-2xl">
      {jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd }}
        />
      ) : null}
      {/* Back link */}
      <div className="px-4 pt-4 sm:px-0 sm:pt-6">
        <Link
          href="/bons-plans"
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Bons plans
        </Link>
      </div>

      {/* Hero image */}
      <div className="relative mt-3 px-4 sm:px-0">
        {dealPhotos.length > 0 ? (
          <ListingGallery photos={dealPhotos} title={deal.title} />
        ) : (
          <DealImagePlaceholder
            emoji={placeholderEmoji}
            label={placeholderLabel}
            className="aspect-[4/3] w-full sm:aspect-[16/10]"
          />
        )}
        <div className="absolute left-5 top-2 sm:left-1">
          <TemperatureBadge temperature={deal.temperature} />
        </div>
      </div>

      {/* Header */}
      <header className="space-y-3 px-4 pt-5 sm:px-0">
        <div className="flex flex-wrap items-center gap-2">
          <CategoryChip name={deal.category.name} icon={deal.category.icon} />
          {deal.city && <CommuneChip name={deal.city.name} />}
          <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground">
            <Clock className="h-3 w-3" aria-hidden />
            {formatRelativeTime(deal.publishedAt)}
          </span>
        </div>

        <h1 className="font-display text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
          {deal.title}
        </h1>

        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <StoreIcon className="h-4 w-4 shrink-0" aria-hidden />
          <span className="truncate">{sellerName}</span>
          {deal.merchant?.domain && (
            <span className="text-xs">· {deal.merchant.domain}</span>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Publié le <time dateTime={deal.publishedAt.toISOString()}>{publishedDateLabel}</time>
          {showUpdatedAt && (
            <>
              {" "}· mis à jour le{" "}
              <time dateTime={deal.updatedAt.toISOString()}>{updatedDateLabel}</time>
            </>
          )}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          {isAuthor && (
            <AuthorControls
              dealId={deal.id}
              editHref={`/bons-plans/${deal.slug}/edit`}
            />
          )}
          <FavoriteButton
            dealId={deal.id}
            initialFavorited={isFavorited}
            canFavorite={canFavorite}
            disabledHint={favoriteDisabledHint}
            size="md"
          />
          {currentUser && !isAuthor && (
            <ReportDialog
              kind="deal"
              targetId={deal.id}
              title="Signaler ce bon plan"
              variant="ghost"
            />
          )}
        </div>
      </header>

      {/* Partage — WhatsApp/Messenger/Copier. Clé en Guyane où WhatsApp
          est le canal de viralité principal, bien devant Facebook. */}
      <section className="mt-4 px-4 sm:px-0">
        <ShareRow
          url={`${getSiteUrl()}/bons-plans/${deal.slug}`}
          text={`${deal.title} — ${deal.isFree ? "Gratuit" : `${deal.price}€`}`}
        />
      </section>

      {/* Vote */}
      <section className="mt-5 px-4 sm:px-0">
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Ce bon plan est-il bien ?
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Vote chaud pour soutenir, froid si le prix n&apos;est pas bon.
            </p>
          </div>
          <VoteButtons
            dealId={deal.id}
            temperature={deal.temperature}
            upvotes={deal.upvotes}
            downvotes={deal.downvotes}
            myVote={myVote}
            canVote={canVote}
            disabledHint={voteDisabledHint}
            variant="wide"
          />
        </div>
      </section>

      {/* Price + CTA */}
      <section className="mt-5 space-y-4 px-4 sm:px-0">
        <PriceTag
          price={deal.price.toString()}
          originalPrice={deal.originalPrice?.toString() ?? null}
          discountPercent={deal.discountPercent ?? null}
          isFree={deal.isFree}
          size="lg"
        />

        {ctaUrl ? (
          <Button asChild size="lg" className="w-full">
            <a
              href={ctaUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
            >
              Voir l&apos;offre
              <ExternalLink className="h-4 w-4" aria-hidden />
            </a>
          </Button>
        ) : (
          <div className="rounded-md border border-dashed border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            Offre à retirer en magasin
            {deal.store?.address ? ` · ${deal.store.address}` : ""}
          </div>
        )}

        {deal.expiresAt && (
          <p className="text-xs text-muted-foreground">
            Expire {formatRelativeTime(deal.expiresAt)}
          </p>
        )}
      </section>

      {/* Stats */}
      <section className="mt-6 grid grid-cols-4 gap-2 px-4 sm:px-0">
        <Stat
          icon={<Flame className="h-4 w-4" />}
          value={deal.upvotes}
          label="Chaud"
          tone="hot"
        />
        <Stat
          icon={<Snowflake className="h-4 w-4" />}
          value={deal.downvotes}
          label="Froid"
          tone="cold"
        />
        <Stat
          icon={<MessageSquare className="h-4 w-4" />}
          value={deal.commentCount}
          label="Avis"
        />
        <Stat
          icon={<Eye className="h-4 w-4" />}
          value={deal.viewCount}
          label="Vues"
        />
      </section>

      {/* Description */}
      {deal.description && (
        <section className="mt-6 px-4 sm:px-0">
          <h2 className="font-display text-lg font-semibold">Description</h2>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground">
            {deal.description}
          </p>
        </section>
      )}

      {/* Store details */}
      {deal.store && (
        <section className="mt-6 px-4 sm:px-0">
          <h2 className="font-display text-lg font-semibold">Où le trouver</h2>
          <div className="mt-2 flex items-start gap-2 rounded-lg border border-border bg-card p-3 text-sm">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-peyi-orange-500" aria-hidden />
            <div className="min-w-0">
              <p className="font-semibold">{deal.store.name}</p>
              {deal.store.address && (
                <p className="text-muted-foreground">{deal.store.address}</p>
              )}
              <p className="text-muted-foreground">{deal.store.city.name}</p>
            </div>
          </div>
        </section>
      )}

      {/* Author */}
      <section className="mt-6 px-4 sm:px-0">
        <h2 className="font-display text-lg font-semibold">Partagé par</h2>
        <div className="mt-2 flex items-center gap-3 rounded-lg border border-border bg-card p-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-peyi-orange-100 font-display text-base font-bold text-peyi-orange-700">
            {deal.author.username.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">
              @{deal.author.username}
            </p>
            <p className="text-xs text-muted-foreground">
              <span aria-hidden>{level.emoji}</span> {level.label} ·{" "}
              {deal.author.karma.toLocaleString("fr-FR")} karma
              {deal.author.city?.name ? ` · ${deal.author.city.name}` : ""}
            </p>
          </div>
        </div>
      </section>

      <section className="mt-6 px-4 sm:px-0">
        <h2 className="font-display text-lg font-semibold">Voir aussi</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {cityPath && deal.city && (
            <li>
              <Link
                href={cityPath}
                className="text-peyi-orange-700 hover:underline"
              >
                Voir les bons plans à {deal.city.name}
              </Link>
            </li>
          )}
          <li>
            <Link href={categoryPath} className="text-peyi-orange-700 hover:underline">
              Voir les bons plans {deal.category.name.toLowerCase()} en Guyane
            </Link>
          </li>
          {storePath && deal.store && (
            <li>
              <Link href={storePath} className="text-peyi-orange-700 hover:underline">
                Voir les promos chez {deal.store.name}
              </Link>
            </li>
          )}
        </ul>
      </section>

      {/* Comments */}
      <section className="mt-6 px-4 sm:px-0">
        <h2 className="font-display text-lg font-semibold">
          Avis de la communauté ({deal.commentCount})
        </h2>
        <div className="mt-3">
          <CommentList
            dealId={deal.id}
            dealSlug={deal.slug}
            currentUserId={currentUser?.id ?? null}
          />
        </div>
      </section>
    </main>
  );
}

function Stat({
  icon,
  value,
  label,
  tone,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  tone?: "hot" | "cold";
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-lg border border-border bg-card px-2 py-2 text-center",
      )}
    >
      <span
        className={cn(
          "flex items-center justify-center",
          tone === "hot" && "text-hot",
          tone === "cold" && "text-cold",
        )}
        aria-hidden
      >
        {icon}
      </span>
      <span className="mt-1 text-sm font-bold tabular-nums">
        {value.toLocaleString("fr-FR")}
      </span>
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
    </div>
  );
}
