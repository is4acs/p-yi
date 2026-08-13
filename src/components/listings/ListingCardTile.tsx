import Link from "next/link";
import Image from "next/image";
import { Clock, Flame, Images } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/format";
import {
  isOptimizableImageUrl,
  isRenderableImageUrl,
} from "@/lib/images";
import {
  type ListingCardData,
  formatPriceType,
} from "@/lib/listings/queries";
import { summarizeAttributesForCard } from "@/lib/listings/field-registry";
import { Badge } from "@/components/ui/badge";
import { getLocale, getMessages } from "@/lib/i18n";
import { translateUserText } from "@/lib/i18n/translate";
import { DealImagePlaceholder } from "@/components/deals/DealImagePlaceholder";
import { Ph } from "@/components/soleil/Ph";
import { PriceTag as SoleilPriceTag } from "@/components/soleil/PriceTag";
import { ListingFavoriteButton } from "./ListingFavoriteButton";
import { ListingTypeChip } from "./ListingTypeChip";

/**
 * ListingCardTile — variante **photo-first** pour la grille `/annonces`.
 *
 * Différences avec `ListingCard` (horizontal, info-dense) :
 *  - Conteneur blanc avec border `ink-100` (spec handoff AdCard) —
 *    donne une "carte" visible même quand l'image est petite.
 *  - Image **5:3** en haut (spec handoff, avant S28 on était en 4:3).
 *    Ratio plus large = moins de hauteur par tile, gain de densité sur
 *    mobile (on voit ~4 tiles avant scroll au lieu de 3).
 *  - Moins d'infos en dessous : prix + titre + ville/date. Exit les
 *    résumés d'attributs, la condition, les badges "à la une" (qui
 *    restent visibles sur la page détail).
 *  - Système de **badges unifié** (S28) : NOUVEAU (vert) pour les
 *    annonces <72h, URGENT (rouge+flamme) pour `isUrgent`. Un seul
 *    badge à la fois en haut-gauche — URGENT gagne quand les deux
 *    s'appliquent (signal plus fort).
 *  - Le type d'annonce n'apparaît que pour les **cas non-défaut**
 *    (Recherche, Échange, Don). "Propose" est la norme (~80% du
 *    catalogue) — l'afficher partout = bruit visuel.
 *
 * Typo alignée au handoff (`components.md §AdCard`) :
 *  - Title : `--f-display` 700, 13px
 *  - Price : `--f-display` 800, 15px, couleur action (orange-700)
 *  - Body padding : 9px 11px 10px
 *
 * Pourquoi pas remplacer `ListingCard` partout ? Les favoris
 * (`/profil/favoris`) et la home `/` gardent le layout horizontal
 * pour une raison : sur un flux en colonne étroite, l'horizontal
 * permet de montrer plus d'infos utiles. La grille n'a de sens que
 * sur une vue large avec beaucoup de résultats.
 */

type Props = {
  listing: ListingCardData;
  currentUserId?: string | null;
  isFavorited?: boolean;
  // `soleil` : tuile de la grille /annonces refondue (T4) — photo 118px
  //   arrondie 14px + PriceTag posé sur la photo, titre 12.5px, ville·ago.
  // `catalogue` : carte du catalogue « calme » (S38) — carte bordée
  //   radius 16 fond paper, photo 180/170, prix posé sur la photo,
  //   ligne d'attributs sous le titre, ville · date.
  // `row` : rangée horizontale modèle Leboncoin (S39) — photo à gauche,
  //   titre, prix en gras, ligne d'attributs, ville · date, favori en
  //   haut à droite. Utilisée sur la liste /annonces.
  variant?: "default" | "soleil" | "catalogue" | "row";
  className?: string;
};

// Une annonce est "nouvelle" si publiée il y a moins de 72h. Seuil
// calé sur le temps moyen avant qu'un item se fasse remarquer par
// les premiers curieux — au-delà, le badge n'apporte plus de signal
// et devient du bruit visuel ("tout est nouveau = rien ne l'est").
const NEW_BADGE_WINDOW_MS = 72 * 60 * 60 * 1000;

function isRecentlyPublished(publishedAt: Date | string | null): boolean {
  if (!publishedAt) return false;
  const ts =
    typeof publishedAt === "string"
      ? new Date(publishedAt).getTime()
      : publishedAt.getTime();
  return Date.now() - ts < NEW_BADGE_WINDOW_MS;
}

export async function ListingCardTile({
  listing,
  currentUserId,
  isFavorited = false,
  variant = "default",
  className,
}: Props) {
  const locale = await getLocale();
  // Titre traduit vers la langue de l'interface (cf. lib/i18n/translate.ts).
  const { text: displayTitle } = await translateUserText(listing.title, locale);
  const t = await getMessages();
  const isAuthenticated = Boolean(currentUserId);
  const canFavorite = isAuthenticated && currentUserId !== listing.authorId;
  const favoriteHint = !isAuthenticated
    ? t.listingDetail.loginToSave
    : currentUserId === listing.authorId
    ? t.listingDetail.ownListing
    : undefined;

  const priceLabel = formatPriceType(listing.priceType, listing.price, locale);
  const locationLabel = listing.neighborhood
    ? `${listing.city.name} · ${listing.neighborhood}`
    : listing.city.name;
  const photoCount = listing._count.images;
  // OFFER = "Propose" = type par défaut : on le masque pour réduire
  // le bruit visuel. Les 3 autres types sont distinctifs et méritent
  // d'apparaître directement sur la tuile.
  const showTypeChip = listing.type !== "OFFER";
  // URGENT bat NOUVEAU : même si c'est <72h, le signal d'urgence
  // prime. Un seul badge en haut-gauche pour garder la tile lisible.
  const showNewBadge = !listing.isUrgent && isRecentlyPublished(listing.publishedAt);

  if (variant === "row") {
    const attrLine = summarizeAttributesForCard(
      listing.category.slug,
      listing.attributes,
    );
    return (
      <article
        className={cn(
          "relative flex overflow-hidden rounded-2xl border border-soleil-line bg-soleil-paper text-soleil-forest transition hover:shadow-sm dark:border-soleil-line-d dark:bg-soleil-forest dark:text-soleil-cream",
          className,
        )}
      >
        <Link
          href={`/annonces/${listing.slug}`}
          className="flex min-w-0 flex-1 transition active:scale-[0.995]"
        >
          <div className="relative h-[124px] w-[124px] flex-none sm:h-[168px] sm:w-[224px]">
            {isRenderableImageUrl(listing.coverImageUrl) ? (
              <Image
                src={listing.coverImageUrl}
                alt={displayTitle}
                fill
                sizes="(max-width: 640px) 124px, 224px"
                unoptimized={!isOptimizableImageUrl(listing.coverImageUrl)}
                className="object-cover"
              />
            ) : (
              <Ph label={listing.category.name} className="h-full w-full" />
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col p-3 pr-11 sm:p-4 sm:pr-12">
            <h2 className="line-clamp-2 font-display text-[14.5px] font-bold leading-[1.3] sm:text-base">
              {displayTitle}
            </h2>
            <p className="mt-1 font-display text-[15px] font-extrabold sm:text-[17px]">
              {priceLabel}
            </p>
            {attrLine && (
              <p className="mt-1 line-clamp-1 text-xs text-soleil-muted2 dark:text-soleil-muted-d">
                {attrLine}
              </p>
            )}
            <p className="mt-auto truncate pt-1.5 text-xs text-soleil-muted2 dark:text-soleil-muted-d">
              {locationLabel} ·{" "}
              {formatRelativeTime(listing.bumpedAt ?? listing.publishedAt, locale)}
            </p>
          </div>
        </Link>
        <div className="absolute right-2.5 top-2.5">
          <ListingFavoriteButton
            listingId={listing.id}
            initialFavorited={isFavorited}
            canFavorite={canFavorite}
            disabledHint={favoriteHint}
            size="sm"
          />
        </div>
      </article>
    );
  }

  if (variant === "catalogue") {
    const attrLine = summarizeAttributesForCard(
      listing.category.slug,
      listing.attributes,
    );
    return (
      <article
        className={cn(
          "relative overflow-hidden rounded-2xl border border-soleil-line bg-soleil-paper text-soleil-forest transition hover:shadow-sm dark:border-soleil-line-d dark:bg-soleil-forest dark:text-soleil-cream",
          className,
        )}
      >
        <Link
          href={`/annonces/${listing.slug}`}
          className="block transition active:scale-[0.99]"
        >
          <div className="relative h-[180px] lg:h-[170px]">
            {isRenderableImageUrl(listing.coverImageUrl) ? (
              <Image
                src={listing.coverImageUrl}
                alt={displayTitle}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                unoptimized={!isOptimizableImageUrl(listing.coverImageUrl)}
                className="object-cover"
              />
            ) : (
              <Ph label={listing.category.name} className="h-full w-full" />
            )}
            <span className="absolute bottom-2.5 left-2.5 rounded-lg bg-soleil-cream px-[11px] py-1.5 text-sm font-extrabold text-soleil-forest dark:bg-soleil-night dark:text-soleil-cream">
              {priceLabel}
            </span>
          </div>
          <div className="px-3.5 pb-[15px] pt-[13px]">
            <h2 className="line-clamp-2 font-display text-[14.5px] font-bold leading-[1.3]">
              {displayTitle}
            </h2>
            {attrLine && (
              <p className="mt-[7px] line-clamp-1 text-xs text-soleil-muted2 dark:text-soleil-muted-d">
                {attrLine}
              </p>
            )}
            <p className="mt-1 truncate text-xs text-soleil-muted2 dark:text-soleil-muted-d">
              {locationLabel} ·{" "}
              {formatRelativeTime(listing.bumpedAt ?? listing.publishedAt, locale)}
            </p>
          </div>
        </Link>
        <div className="absolute right-2.5 top-2.5">
          <ListingFavoriteButton
            listingId={listing.id}
            initialFavorited={isFavorited}
            canFavorite={canFavorite}
            disabledHint={favoriteHint}
            size="sm"
          />
        </div>
      </article>
    );
  }

  if (variant === "soleil") {
    return (
      <article
        className={cn(
          "relative text-soleil-forest dark:text-soleil-cream",
          className,
        )}
      >
        <Link
          href={`/annonces/${listing.slug}`}
          className="block transition active:scale-[0.99]"
        >
          <div className="relative h-[118px] overflow-hidden rounded-[14px]">
            {isRenderableImageUrl(listing.coverImageUrl) ? (
              <Image
                src={listing.coverImageUrl}
                alt={listing.title}
                fill
                sizes="(max-width: 1024px) 50vw, 25vw"
                unoptimized={!isOptimizableImageUrl(listing.coverImageUrl)}
                className="object-cover"
              />
            ) : (
              <Ph label={listing.category.name} className="h-full w-full" />
            )}
            <SoleilPriceTag>{priceLabel}</SoleilPriceTag>
          </div>
          <h2 className="mt-1.5 line-clamp-2 text-[12.5px] font-bold leading-[1.3]">
            {displayTitle}
          </h2>
          <p className="mt-0.5 truncate text-[10.5px] text-soleil-muted2 dark:text-soleil-muted-d">
            {locationLabel} ·{" "}
            {formatRelativeTime(listing.bumpedAt ?? listing.publishedAt, locale)}
          </p>
        </Link>
        <div className="absolute right-2 top-2">
          <ListingFavoriteButton
            listingId={listing.id}
            initialFavorited={isFavorited}
            canFavorite={canFavorite}
            disabledHint={favoriteHint}
            size="sm"
          />
        </div>
      </article>
    );
  }

  return (
    <article
      className={cn(
        // Carte handoff : fond blanc, border ink-100, radius-md (14px
        // en spec ≈ `rounded-xl` 12px en Tailwind, différence invisible).
        // `overflow-hidden` pour clipper l'image aux coins arrondis.
        "group relative flex flex-col overflow-hidden rounded-xl border border-ink-100 bg-background transition-shadow hover:shadow-sm",
        listing.isBoosted && "border-peyi-orange-300 ring-1 ring-peyi-orange-200",
        className,
      )}
    >
      <Link
        href={`/annonces/${listing.slug}`}
        className="flex flex-col active:scale-[0.99]"
      >
        <div className="relative aspect-[5/3] overflow-hidden bg-muted/40">
          {isRenderableImageUrl(listing.coverImageUrl) ? (
            <Image
              src={listing.coverImageUrl}
              alt={listing.title}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition-transform duration-base group-hover:scale-[1.02]"
              unoptimized={!isOptimizableImageUrl(listing.coverImageUrl)}
            />
          ) : (
            <DealImagePlaceholder
              emoji={listing.category.icon ?? null}
              label={listing.title}
              className="h-full w-full"
            />
          )}

          {/* Slot top-left : un seul badge à la fois. URGENT (Flame)
              prime sur NOUVEAU (vert). Pas d'empilement — l'œil doit
              attraper UN signal, pas déchiffrer une pile. */}
          {listing.isUrgent ? (
            <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-hot/90 px-2 py-[3px] font-display text-[10px] font-extrabold uppercase tracking-[0.08em] text-white shadow">
              <Flame className="h-3 w-3" aria-hidden />
              Urgent
            </span>
          ) : showNewBadge ? (
            <Badge variant="new" className="absolute left-2 top-2 shadow">
              {t.listings.newBadge}
            </Badge>
          ) : null}

          {showTypeChip && (
            <span className="absolute bottom-2 left-2">
              <ListingTypeChip type={listing.type} locale={locale} />
            </span>
          )}

          {photoCount > 1 && (
            <span
              className="pointer-events-none absolute bottom-2 right-2 inline-flex items-center gap-0.5 rounded-full bg-black/65 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow backdrop-blur tabular-nums"
              aria-label={`${photoCount} photos`}
            >
              <Images className="h-3 w-3" aria-hidden />
              {photoCount}
            </span>
          )}
        </div>

        {/* Padding body : 9/11/10px = cadence handoff. Pas de space-y :
            on laisse les `leading-*` et margin individuels faire le
            rythme vertical (plus fin qu'un gap uniforme). */}
        <div className="min-w-0 px-[11px] pb-[10px] pt-[9px]">
          <p className="truncate font-display text-[15px] font-extrabold leading-tight tracking-tight text-peyi-orange-700">
            {priceLabel}
          </p>
          <h3 className="mt-0.5 line-clamp-2 font-display text-[13px] font-bold leading-snug text-ink-900 group-hover:text-peyi-orange-800">
            {displayTitle}
          </h3>
          <p className="mt-1 flex items-center gap-1 truncate text-[11px] text-ink-500">
            <span className="truncate">{locationLabel}</span>
            <span aria-hidden>·</span>
            <Clock className="h-3 w-3 shrink-0" aria-hidden />
            <span className="shrink-0">
              {formatRelativeTime(listing.bumpedAt ?? listing.publishedAt, locale)}
            </span>
          </p>
        </div>
      </Link>

      {/* Favori en overlay absolu sur l'image — pas dans le Link pour
          éviter que le tap sur le cœur déclenche une nav vers le détail. */}
      <div className="absolute right-2 top-2">
        <ListingFavoriteButton
          listingId={listing.id}
          initialFavorited={isFavorited}
          canFavorite={canFavorite}
          disabledHint={favoriteHint}
          size="sm"
        />
      </div>
    </article>
  );
}
