import Link from "next/link";
import { notFound } from "next/navigation";
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

export const dynamic = "force-dynamic";

// ---------- data ----------

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
  publishedAt: true,
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

async function getDeal(slug: string) {
  return prisma.deal.findFirst({
    where: { slug, status: DealStatus.PUBLISHED },
    select: dealDetailSelect,
  });
}

// ---------- SEO ----------

export async function generateMetadata(
  props: {
    params: Promise<{ slug: string }>;
  }
): Promise<Metadata> {
  const params = await props.params;
  const deal = await prisma.deal.findFirst({
    where: { slug: params.slug, status: DealStatus.PUBLISHED },
    select: {
      title: true,
      description: true,
      slug: true,
      coverImageUrl: true,
      category: { select: { name: true } },
      city: { select: { name: true } },
    },
  });
  if (!deal) return { title: "Bon plan introuvable" };

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
  const [deal, currentUser] = await Promise.all([
    getDeal(params.slug),
    getCurrentUser(),
  ]);
  if (!deal) notFound();

  const isAuthor = currentUser?.id === deal.author.id;
  let myVote: VoteType | null = null;
  let isFavorited = false;
  if (currentUser) {
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
  const level = LEVEL_META[deal.author.level];
  const placeholderEmoji = deal.category.icon ?? null;
  const placeholderLabel = deal.store?.name ?? deal.merchant?.name ?? deal.title;

  // JSON-LD — Product + Offer pour la rich card produit, et
  // BreadcrumbList pour le fil d'ariane dans les SERPs. Tout est
  // sérialisé en une seule balise <script> pour simplifier.
  const jsonLd = serializeJsonLd([
    buildDealJsonLd({
      slug: deal.slug,
      title: deal.title,
      description: deal.description,
      price: deal.price,
      currency: deal.currency,
      isFree: deal.isFree,
      expiresAt: deal.expiresAt,
      publishedAt: deal.publishedAt,
      coverImageUrl: deal.coverImageUrl,
      category: deal.category,
      city: deal.city,
      store: deal.store ? { name: deal.store.name } : null,
      merchant: deal.merchant ? { name: deal.merchant.name } : null,
      author: { username: deal.author.username },
    }),
    buildBreadcrumbJsonLd([
      { name: "Accueil", url: "/" },
      { name: "Bons plans", url: "/bons-plans" },
      { name: deal.category.name, url: `/bons-plans?category=${deal.category.slug}` },
      { name: deal.title, url: `/bons-plans/${deal.slug}` },
    ]),
  ]);

  return (
    <main className="mx-auto max-w-md pb-16 animate-in fade-in duration-300 sm:max-w-2xl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
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
        <DealImagePlaceholder
          emoji={placeholderEmoji}
          label={placeholderLabel}
          className="aspect-[4/3] w-full sm:aspect-[16/10]"
        />
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
