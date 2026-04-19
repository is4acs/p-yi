import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  ArrowLeft,
  ChevronRight,
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
import {
  buildBreadcrumbJsonLd,
  buildListingJsonLd,
  serializeJsonLd,
} from "@/lib/seo/json-ld";

import { CategoryChip } from "@/components/deals/CategoryChip";
import { CommuneChip } from "@/components/deals/CommuneChip";
import { DealImagePlaceholder } from "@/components/deals/DealImagePlaceholder";
import { ListingAttributes } from "@/components/listings/ListingAttributes";
import { ListingFavoriteButton } from "@/components/listings/ListingFavoriteButton";
import { ListingGallery } from "@/components/listings/ListingGallery";
import { ListingTypeChip } from "@/components/listings/ListingTypeChip";
import { ListingAuthorControls } from "@/components/listings/ListingAuthorControls";
import { ContactSellerForm } from "@/components/messages/ContactSellerForm";
import { ReportDialog } from "@/components/reports/ReportDialog";

export const dynamic = "force-dynamic";

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

async function getListing(slug: string) {
  return prisma.listing.findFirst({
    where: { slug, status: ListingStatus.PUBLISHED },
    select: listingDetailSelect,
  });
}

export async function generateMetadata(
  props: {
    params: Promise<{ slug: string }>;
  }
): Promise<Metadata> {
  const params = await props.params;
  const listing = await prisma.listing.findFirst({
    where: { slug: params.slug, status: ListingStatus.PUBLISHED },
    select: {
      title: true,
      description: true,
      slug: true,
      coverImageUrl: true,
      price: true,
      priceType: true,
      category: { select: { name: true } },
      city: { select: { name: true } },
    },
  });
  if (!listing) return { title: "Annonce introuvable" };

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

  // JSON-LD : Product + Offer + BreadcrumbList. On injecte au début du
  // `<main>` pour que le crawler le trouve vite, et on le sérialise via
  // `serializeJsonLd` qui échappe les éventuels `</script>` dans la
  // description utilisateur (sinon un utilisateur malin pourrait casser
  // le parsing HTML depuis le champ description).
  const jsonLd = serializeJsonLd([
    buildListingJsonLd({
      slug: listing.slug,
      title: listing.title,
      description: listing.description,
      price: listing.price,
      currency: listing.currency,
      priceType: listing.priceType,
      condition: listing.condition,
      coverImageUrl: listing.coverImageUrl,
      images: listing.images,
      category: { name: listing.category.name },
      city: { name: listing.city.name },
      author: { username: listing.author.username },
      publishedAt: listing.publishedAt,
    }),
    buildBreadcrumbJsonLd([
      { name: "Accueil", url: "/" },
      { name: "Annonces", url: "/annonces" },
      {
        name: listing.category.name,
        url: `/annonces?category=${listing.category.slug}`,
      },
      { name: listing.title, url: `/annonces/${listing.slug}` },
    ]),
  ]);

  return (
    <main className="mx-auto max-w-md pb-16 animate-in fade-in duration-300 sm:max-w-2xl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <nav
        aria-label="Fil d'Ariane"
        className="flex flex-wrap items-center gap-1 px-4 pt-4 text-sm text-muted-foreground sm:px-0 sm:pt-6"
      >
        <Link
          href="/annonces"
          className="inline-flex items-center gap-1 font-medium transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Annonces
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" aria-hidden />
        <Link
          href={`/annonces?category=${encodeURIComponent(listing.category.slug)}`}
          className="truncate font-medium transition hover:text-foreground"
        >
          {listing.category.icon ? `${listing.category.icon} ` : ""}
          {listing.category.name}
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" aria-hidden />
        <Link
          href={`/annonces?city=${encodeURIComponent(listing.city.slug)}`}
          className="truncate font-medium transition hover:text-foreground"
        >
          {listing.city.name}
        </Link>
      </nav>

      {/* Hero : multi-photo gallery. Fall back to coverImageUrl (legacy
          listings pre-Session 15) or a category emoji placeholder. */}
      <div className="relative mt-3 px-4 sm:px-0">
        {listing.images.length > 0 ? (
          <ListingGallery photos={listing.images} title={listing.title} />
        ) : listing.coverImageUrl ? (
          <ListingGallery
            photos={[{ url: listing.coverImageUrl }]}
            title={listing.title}
          />
        ) : (
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl sm:aspect-[16/10]">
            <DealImagePlaceholder
              emoji={listing.category.icon ?? null}
              label={listing.title}
              className="h-full w-full"
            />
          </div>
        )}
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
            <ContactSellerForm
              recipientUsername={listing.author.username}
              listingSlug={listing.slug}
            />
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

      {/* Caractéristiques spécifiques à la catégorie (ex. surface, km, DPE) */}
      <ListingAttributes
        categorySlug={listing.category.slug}
        attributes={listing.attributes}
      />

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
