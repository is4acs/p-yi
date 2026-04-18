import Link from "next/link";
import Image from "next/image";
import { Clock, Flame, Images } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/format";
import {
  type ListingCardData,
  formatPriceType,
} from "@/lib/listings/queries";
import { DealImagePlaceholder } from "@/components/deals/DealImagePlaceholder";
import { ListingFavoriteButton } from "./ListingFavoriteButton";
import { ListingTypeChip } from "./ListingTypeChip";

/**
 * ListingCardTile — variante **photo-first** pour la grille `/annonces`.
 *
 * Différences avec `ListingCard` (horizontal, info-dense) :
 *  - Image 4:3 en haut (pas 96×96 à gauche) — donne ~140px de hauteur
 *    photo sur un viewport 375px/2 cols, suffisant pour reconnaître
 *    l'objet d'un coup d'œil.
 *  - Moins d'infos en dessous : prix + titre + ville/date. Exit les
 *    résumés d'attributs, la condition, les badges "à la une" (qui
 *    restent visibles sur la page détail).
 *  - Le type d'annonce n'apparaît que pour les **cas non-défaut**
 *    (Recherche, Échange, Don). "Propose" est la norme (~80% du
 *    catalogue) — l'afficher partout = bruit visuel.
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
  className?: string;
};

export function ListingCardTile({
  listing,
  currentUserId,
  isFavorited = false,
  className,
}: Props) {
  const isAuthenticated = Boolean(currentUserId);
  const canFavorite = isAuthenticated && currentUserId !== listing.authorId;
  const favoriteHint = !isAuthenticated
    ? "Connecte-toi pour sauvegarder."
    : currentUserId === listing.authorId
    ? "C'est ton annonce."
    : undefined;

  const priceLabel = formatPriceType(listing.priceType, listing.price);
  const locationLabel = listing.neighborhood
    ? `${listing.city.name} · ${listing.neighborhood}`
    : listing.city.name;
  const photoCount = listing._count.images;
  // OFFER = "Propose" = type par défaut : on le masque pour réduire
  // le bruit visuel. Les 3 autres types sont distinctifs et méritent
  // d'apparaître directement sur la tuile.
  const showTypeChip = listing.type !== "OFFER";

  return (
    <article
      className={cn(
        "group relative flex flex-col",
        className,
      )}
    >
      <Link
        href={`/annonces/${listing.slug}`}
        className="flex flex-col active:scale-[0.99]"
      >
        <div
          className={cn(
            "relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-muted/40",
            listing.isBoosted && "border-peyi-orange-300 ring-1 ring-peyi-orange-200",
          )}
        >
          {listing.coverImageUrl ? (
            <Image
              src={listing.coverImageUrl}
              alt={listing.title}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition-transform duration-base group-hover:scale-[1.02]"
              unoptimized
            />
          ) : (
            <DealImagePlaceholder
              emoji={listing.category.icon ?? null}
              label={listing.title}
              className="h-full w-full"
            />
          )}

          {listing.isUrgent && (
            <span className="absolute left-2 top-2 inline-flex items-center gap-0.5 rounded-full bg-hot/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow">
              <Flame className="h-3 w-3" aria-hidden />
              Urgent
            </span>
          )}

          {showTypeChip && (
            <span className="absolute bottom-2 left-2">
              <ListingTypeChip type={listing.type} />
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

        <div className="mt-2 min-w-0 space-y-0.5 px-0.5">
          <p className="truncate font-display text-base font-extrabold tracking-tight text-peyi-orange-700">
            {priceLabel}
          </p>
          <h3 className="line-clamp-2 text-sm font-medium leading-snug text-ink-900 group-hover:text-peyi-orange-800">
            {listing.title}
          </h3>
          <p className="flex items-center gap-1 truncate text-[11px] text-ink-500">
            <span className="truncate">{locationLabel}</span>
            <span aria-hidden>·</span>
            <Clock className="h-3 w-3 shrink-0" aria-hidden />
            <span className="shrink-0">
              {formatRelativeTime(listing.bumpedAt ?? listing.publishedAt)}
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
