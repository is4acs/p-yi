import Link from "next/link";
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
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
import { isRenderableImageUrl } from "@/lib/images";
import { rethrowIfNextInternal } from "@/lib/next-errors";
import { withTimeout } from "@/lib/async/with-timeout";
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
import { ShareRow } from "@/components/shared/ShareRow";
import { getSiteUrl } from "@/lib/site-url";
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
      <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-12 text-center sm:max-w-2xl">
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Annonce indisponible temporairement
        </h1>
        <p className="mt-3 max-w-sm text-sm text-muted-foreground sm:text-base">
          La fiche n&apos;a pas pu être chargée pour le moment. Réessaie dans
          quelques secondes.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Link
            href="/annonces"
            className="inline-flex h-10 items-center rounded-full bg-peyi-orange-500 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-peyi-orange-600"
          >
            Retour aux annonces
          </Link>
          <Link
            href={`/annonces/${params.slug}`}
            className="inline-flex h-10 items-center rounded-full border border-border bg-background px-4 text-sm font-semibold text-foreground transition hover:border-peyi-orange-300"
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
  // d'enum partielle) — sinon `level.emoji` plus bas crash la page.
  const level = LEVEL_META[listing.author.level] ?? LEVEL_META.BEGINNER;
  const locationLabel = listing.neighborhood
    ? `${listing.city.name} · ${listing.neighborhood}`
    : listing.city.name;
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
    <main className="mx-auto max-w-md pb-16 animate-in fade-in duration-300 sm:max-w-2xl">
      {jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd }}
        />
      ) : null}
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
          href={categoryPath}
          className="truncate font-medium transition hover:text-foreground"
        >
          {listing.category.icon ? `${listing.category.icon} ` : ""}
          {listing.category.name}
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" aria-hidden />
        <Link href={cityPath} className="truncate font-medium transition hover:text-foreground">
          {listing.city.name}
        </Link>
      </nav>

      {/* Hero : multi-photo gallery. Fall back to coverImageUrl (legacy
          listings pre-Session 15) or a category emoji placeholder. On
          ne passe que des URLs validées par `isRenderableImageUrl` —
          sinon `next/image` throw au render et on retombe sur l'erreur
          globale "Quelque chose s'est mal passé". */}
      <div className="relative mt-3 px-4 sm:px-0">
        {sanitizedImages.length > 0 ? (
          <ListingGallery photos={sanitizedImages} title={listing.title} />
        ) : safeCoverImageUrl ? (
          <ListingGallery
            photos={[{ url: safeCoverImageUrl }]}
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

        <p className="text-xs text-muted-foreground">
          Publiée le{" "}
          <time dateTime={listing.publishedAt.toISOString()}>{publishedDateLabel}</time>
          {showUpdatedAt && (
            <>
              {" "}· mise à jour le{" "}
              <time dateTime={listing.updatedAt.toISOString()}>{updatedDateLabel}</time>
            </>
          )}
        </p>

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

      {/* Partage */}
      <section className="mt-4 px-4 sm:px-0">
        <ShareRow
          url={`${getSiteUrl()}/annonces/${listing.slug}`}
          text={`${listing.title}${listing.price ? ` — ${listing.price}€` : ""}`}
        />
      </section>

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

      <section className="mt-6 px-4 sm:px-0">
        <h2 className="font-display text-lg font-semibold">Voir aussi</h2>
        <ul className="mt-3 space-y-2 text-sm">
          <li>
            <Link href={cityPath} className="text-peyi-orange-700 hover:underline">
              Voir les annonces à {listing.city.name}
            </Link>
          </li>
          <li>
            <Link href={categoryPath} className="text-peyi-orange-700 hover:underline">
              Voir les annonces {listing.category.name.toLowerCase()} en Guyane
            </Link>
          </li>
          <li>
            <Link href="/annonces/guyane" className="text-peyi-orange-700 hover:underline">
              Voir toutes les annonces en Guyane
            </Link>
          </li>
        </ul>
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
