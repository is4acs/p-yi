import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  ArrowLeft,
  Clock,
  Eye,
  Flame,
  MapPin,
  MessageSquare,
  Phone,
  Sparkles,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import { ListingStatus } from "@prisma/client";
import { formatRelativeTime } from "@/lib/format";
import { LEVEL_META } from "@/lib/deals/user-level";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  CONDITION_LABEL,
  formatPriceType,
  TYPE_LABEL,
} from "@/lib/listings/queries";

import { CategoryChip } from "@/components/deals/CategoryChip";
import { CommuneChip } from "@/components/deals/CommuneChip";
import { DealImagePlaceholder } from "@/components/deals/DealImagePlaceholder";
import { ListingFavoriteButton } from "@/components/listings/ListingFavoriteButton";
import { ListingTypeChip } from "@/components/listings/ListingTypeChip";
import { ListingAuthorControls } from "@/components/listings/ListingAuthorControls";

export const dynamic = "force-dynamic";

const listingDetailSelect = {
  id: true,
  slug: true,
  title: true,
  description: true,
  price: true,
  priceType: true,
  type: true,
  condition: true,
  coverImageUrl: true,
  neighborhood: true,
  contactPhone: true,
  showPhone: true,
  allowMessages: true,
  status: true,
  publishedAt: true,
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
} as const;

async function getListing(slug: string) {
  return prisma.listing.findFirst({
    where: { slug, status: ListingStatus.PUBLISHED },
    select: listingDetailSelect,
  });
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const listing = await prisma.listing.findFirst({
    where: { slug: params.slug, status: ListingStatus.PUBLISHED },
    select: {
      title: true,
      description: true,
      slug: true,
      coverImageUrl: true,
      category: { select: { name: true } },
      city: { select: { name: true } },
    },
  });
  if (!listing) return { title: "Annonce introuvable" };

  const description =
    listing.description.replace(/\s+/g, " ").trim().slice(0, 160) ||
    `${listing.category.name} à ${listing.city.name} — annonce sur Péyi.`;
  const url = `/annonces/${listing.slug}`;
  const images = listing.coverImageUrl
    ? [{ url: listing.coverImageUrl }]
    : undefined;

  return {
    title: listing.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: listing.title,
      description,
      url,
      images,
    },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title: listing.title,
      description,
      images: listing.coverImageUrl ? [listing.coverImageUrl] : undefined,
    },
  };
}

export default async function ListingDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const [listing, currentUser] = await Promise.all([
    getListing(params.slug),
    getCurrentUser(),
  ]);
  if (!listing) notFound();

  const isAuthor = currentUser?.id === listing.author.id;
  let isFavorited = false;
  if (currentUser && !isAuthor) {
    const fav = await prisma.favorite.findUnique({
      where: {
        userId_listingId: {
          userId: currentUser.id,
          listingId: listing.id,
        },
      },
      select: { id: true },
    });
    isFavorited = Boolean(fav);
  }

  const canFavorite = Boolean(currentUser) && !isAuthor;
  const favoriteHint = !currentUser
    ? "Connecte-toi pour sauvegarder."
    : isAuthor
    ? "C'est ton annonce."
    : undefined;

  const priceLabel = formatPriceType(listing.priceType, listing.price);
  const level = LEVEL_META[listing.author.level];
  const locationLabel = listing.neighborhood
    ? `${listing.city.name} · ${listing.neighborhood}`
    : listing.city.name;

  return (
    <main className="mx-auto max-w-md pb-16 animate-in fade-in duration-300 sm:max-w-2xl">
      <div className="px-4 pt-4 sm:px-0 sm:pt-6">
        <Link
          href="/annonces"
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Annonces
        </Link>
      </div>

      {/* Hero */}
      <div className="relative mt-3 px-4 sm:px-0">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl sm:aspect-[16/10]">
          {listing.coverImageUrl ? (
            <Image
              src={listing.coverImageUrl}
              alt={listing.title}
              fill
              sizes="(max-width: 640px) 100vw, 640px"
              className="object-cover"
              unoptimized
              priority
            />
          ) : (
            <DealImagePlaceholder
              emoji={listing.category.icon ?? null}
              label={listing.title}
              className="h-full w-full"
            />
          )}
        </div>
        {listing.isUrgent && (
          <span className="absolute left-5 top-2 inline-flex items-center gap-0.5 rounded-full bg-hot/90 px-2 py-0.5 text-[11px] font-bold uppercase text-white shadow sm:left-1">
            <Flame className="h-3 w-3" aria-hidden />
            Urgent
          </span>
        )}
        {listing.isFeatured && (
          <span className="absolute right-5 top-2 inline-flex items-center gap-0.5 rounded-full bg-amber-500/95 px-2 py-0.5 text-[11px] font-bold text-white shadow sm:right-1">
            <Sparkles className="h-3 w-3" aria-hidden />À la une
          </span>
        )}
      </div>

      {/* Header */}
      <header className="space-y-3 px-4 pt-5 sm:px-0">
        <div className="flex flex-wrap items-center gap-2">
          <ListingTypeChip type={listing.type} />
          <CategoryChip
            name={listing.category.name}
            icon={listing.category.icon}
          />
          <CommuneChip name={locationLabel} />
          <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground">
            <Clock className="h-3 w-3" aria-hidden />
            {formatRelativeTime(listing.bumpedAt ?? listing.publishedAt)}
          </span>
        </div>

        <h1 className="font-display text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
          {listing.title}
        </h1>

        <p className="font-display text-3xl font-bold tracking-tight text-peyi-orange-700">
          {priceLabel}
        </p>

        {listing.condition && (
          <p className="text-sm text-muted-foreground">
            État :{" "}
            <span className="font-medium text-foreground">
              {CONDITION_LABEL[listing.condition]}
            </span>
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {isAuthor ? (
            <ListingAuthorControls
              listingId={listing.id}
              editHref={`/annonces/${listing.slug}/edit`}
            />
          ) : (
            <ListingFavoriteButton
              listingId={listing.id}
              initialFavorited={isFavorited}
              canFavorite={canFavorite}
              disabledHint={favoriteHint}
              size="md"
            />
          )}
        </div>
      </header>

      {/* Contact */}
      {!isAuthor && (
        <section className="mt-5 space-y-2 px-4 sm:px-0">
          {listing.showPhone && listing.contactPhone && (
            <a
              href={`tel:${listing.contactPhone}`}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-peyi-green-500 text-sm font-semibold text-white shadow-sm transition hover:bg-peyi-green-600"
            >
              <Phone className="h-4 w-4" aria-hidden />
              Appeler {listing.contactPhone}
            </a>
          )}
          {listing.allowMessages && currentUser && (
            <button
              type="button"
              disabled
              title="Messagerie à venir."
              className="flex h-12 w-full items-center justify-center gap-2 rounded-md border border-border bg-card text-sm font-semibold text-muted-foreground"
            >
              <MessageSquare className="h-4 w-4" aria-hidden />
              Envoyer un message (bientôt)
            </button>
          )}
          {listing.allowMessages && !currentUser && (
            <Link
              href={`/connexion?next=/annonces/${listing.slug}`}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-md border border-border bg-card text-sm font-semibold text-muted-foreground transition hover:border-peyi-orange-300 hover:text-foreground"
            >
              <MessageSquare className="h-4 w-4" aria-hidden />
              Connecte-toi pour contacter
            </Link>
          )}
        </section>
      )}

      {/* Stats */}
      <section className="mt-6 grid grid-cols-3 gap-2 px-4 sm:px-0">
        <Stat
          icon={<Eye className="h-4 w-4" />}
          value={listing.viewCount}
          label="Vues"
        />
        <Stat
          icon={<MessageSquare className="h-4 w-4" />}
          value={listing.contactCount}
          label="Contacts"
        />
        <Stat
          icon={<Sparkles className="h-4 w-4" />}
          value={listing.favoriteCount}
          label="Favoris"
        />
      </section>

      {/* Description */}
      <section className="mt-6 px-4 sm:px-0">
        <h2 className="font-display text-lg font-semibold">Description</h2>
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground">
          {listing.description}
        </p>
      </section>

      {/* Location */}
      <section className="mt-6 px-4 sm:px-0">
        <h2 className="font-display text-lg font-semibold">Localisation</h2>
        <div className="mt-2 flex items-start gap-2 rounded-lg border border-border bg-card p-3 text-sm">
          <MapPin
            className="mt-0.5 h-4 w-4 shrink-0 text-peyi-orange-500"
            aria-hidden
          />
          <div className="min-w-0">
            <p className="font-semibold">{listing.city.name}</p>
            {listing.neighborhood && (
              <p className="text-muted-foreground">{listing.neighborhood}</p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              Type : {TYPE_LABEL[listing.type]}
            </p>
          </div>
        </div>
      </section>

      {/* Author */}
      <section className="mt-6 px-4 sm:px-0">
        <h2 className="font-display text-lg font-semibold">Vendeur</h2>
        <div className="mt-2 flex items-center gap-3 rounded-lg border border-border bg-card p-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-peyi-orange-100 font-display text-base font-bold text-peyi-orange-700">
            {listing.author.username.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">@{listing.author.username}</p>
            <p className="text-xs text-muted-foreground">
              <span aria-hidden>{level.emoji}</span> {level.label} ·{" "}
              {listing.author.karma.toLocaleString("fr-FR")} karma
              {listing.author.city?.name
                ? ` · ${listing.author.city.name}`
                : ""}
            </p>
          </div>
        </div>
      </section>

      {/* Expiry */}
      <p className="mt-6 px-4 text-center text-xs text-muted-foreground sm:px-0">
        Cette annonce expire {formatRelativeTime(listing.expiresAt)}.
      </p>
    </main>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-border bg-card px-2 py-2 text-center">
      <span className="flex items-center justify-center text-muted-foreground" aria-hidden>
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
