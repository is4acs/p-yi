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
import { DealStatus } from "@prisma/client";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/format";
import { LEVEL_META } from "@/lib/deals/user-level";

import { Button } from "@/components/ui/button";
import { PriceTag } from "@/components/deals/PriceTag";
import { TemperatureBadge } from "@/components/deals/TemperatureBadge";
import { CategoryChip } from "@/components/deals/CategoryChip";
import { CommuneChip } from "@/components/deals/CommuneChip";
import { DealImagePlaceholder } from "@/components/deals/DealImagePlaceholder";

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

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const deal = await prisma.deal.findFirst({
    where: { slug: params.slug, status: DealStatus.PUBLISHED },
    select: { title: true, description: true },
  });
  if (!deal) return { title: "Bon plan introuvable" };
  return {
    title: deal.title,
    description:
      deal.description?.slice(0, 160) ??
      "Bon plan partagé par la communauté Péyi en Guyane.",
  };
}

// ---------- page ----------

export default async function DealDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const deal = await getDeal(params.slug);
  if (!deal) notFound();

  const ctaUrl = deal.affiliateUrl ?? deal.externalUrl ?? deal.store?.website ?? null;
  const sellerName =
    deal.store?.name ?? deal.merchant?.name ?? "Vendeur non précisé";
  const level = LEVEL_META[deal.author.level];
  const placeholderEmoji = deal.category.icon ?? null;
  const placeholderLabel = deal.store?.name ?? deal.merchant?.name ?? deal.title;

  return (
    <main className="mx-auto max-w-md pb-16 sm:max-w-2xl">
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
      </header>

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

      {/* Comments — read-only placeholder until Session 3 */}
      <section className="mt-6 px-4 sm:px-0">
        <h2 className="font-display text-lg font-semibold">
          Avis de la communauté ({deal.commentCount})
        </h2>
        <div className="mt-2 rounded-lg border border-dashed border-border bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
          Les commentaires arrivent bientôt.
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
