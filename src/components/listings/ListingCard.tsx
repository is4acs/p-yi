import Link from "next/link";
import Image from "next/image";
import { Clock, Flame, Images, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/format";
import {
  type ListingCardData,
  formatPriceType,
  CONDITION_LABEL,
} from "@/lib/listings/queries";
import { CategoryChip } from "@/components/deals/CategoryChip";
import { CommuneChip } from "@/components/deals/CommuneChip";
import { DealImagePlaceholder } from "@/components/deals/DealImagePlaceholder";
import { ListingFavoriteButton } from "./ListingFavoriteButton";
import { ListingTypeChip } from "./ListingTypeChip";

export type { ListingCardData };

type Props = {
  listing: ListingCardData;
  currentUserId?: string | null;
  isFavorited?: boolean;
  className?: string;
};

export function ListingCard({
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

  return (
    <article
      className={cn(
        "group flex items-stretch gap-3 rounded-xl border border-border bg-card p-3 shadow-sm transition hover:border-peyi-orange-300 hover:shadow-md",
        listing.isBoosted && "border-peyi-orange-300 ring-1 ring-peyi-orange-200",
        className,
      )}
    >
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg sm:h-28 sm:w-28">
        <Link
          href={`/annonces/${listing.slug}`}
          className="block h-full w-full active:scale-[0.99]"
        >
          {listing.coverImageUrl ? (
            <Image
              src={listing.coverImageUrl}
              alt={listing.title}
              fill
              sizes="(max-width: 640px) 96px, 112px"
              className="object-cover"
              unoptimized
            />
          ) : (
            <DealImagePlaceholder
              emoji={listing.category.icon ?? null}
              label={listing.title}
              className="h-full w-full"
            />
          )}
        </Link>
        <div className="absolute right-1 top-1">
          <ListingFavoriteButton
            listingId={listing.id}
            initialFavorited={isFavorited}
            canFavorite={canFavorite}
            disabledHint={favoriteHint}
            size="sm"
          />
        </div>
        {listing.isUrgent && (
          <span className="absolute left-1 top-1 inline-flex items-center gap-0.5 rounded-full bg-hot/90 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white shadow">
            <Flame className="h-2.5 w-2.5" aria-hidden />
            Urgent
          </span>
        )}
        {photoCount > 1 && (
          <span
            className="pointer-events-none absolute bottom-1 left-1 inline-flex items-center gap-0.5 rounded-full bg-black/65 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow backdrop-blur tabular-nums"
            aria-label={`${photoCount} photos`}
          >
            <Images className="h-3 w-3" aria-hidden />
            {photoCount}
          </span>
        )}
      </div>

      <Link
        href={`/annonces/${listing.slug}`}
        className="flex min-w-0 flex-1 transition active:scale-[0.99]"
      >
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-1.5">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-1.5">
              <ListingTypeChip type={listing.type} />
              {listing.isFeatured && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                  <Sparkles className="h-2.5 w-2.5" aria-hidden />
                  À la une
                </span>
              )}
            </div>
            <h3 className="line-clamp-2 font-display text-sm font-semibold leading-tight text-foreground group-hover:text-peyi-orange-700">
              {listing.title}
            </h3>
          </div>

          <p className="font-display text-base font-bold tracking-tight text-peyi-orange-700">
            {priceLabel}
          </p>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
            <CategoryChip
              name={listing.category.name}
              icon={listing.category.icon}
            />
            <CommuneChip name={locationLabel} />
            {listing.condition && (
              <span className="text-[11px]">
                {CONDITION_LABEL[listing.condition]}
              </span>
            )}
            <span className="inline-flex items-center gap-0.5">
              <Clock className="h-3 w-3" aria-hidden />
              {formatRelativeTime(listing.bumpedAt ?? listing.publishedAt)}
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
