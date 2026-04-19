import Link from "next/link";
import { Clock, Flame, Images } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/format";
import {
  type ListingCardData,
  formatPriceType,
} from "@/lib/listings/queries";
import { Badge } from "@/components/ui/badge";
import { ListingFavoriteButton } from "./ListingFavoriteButton";
import { ListingTypeChip } from "./ListingTypeChip";
import { ListingCardGallery } from "./ListingCardGallery";

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
  // URGENT bat NOUVEAU : même si c'est <72h, le signal d'urgence
  // prime. Un seul badge en haut-gauche pour garder la tile lisible.
  const showNewBadge = !listing.isUrgent && isRecentlyPublished(listing.publishedAt);

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
      <div className="relative aspect-[5/3] overflow-hidden bg-muted/40">
        <ListingCardGallery
          href={`/annonces/${listing.slug}`}
          photos={listing.images}
          coverImageUrl={listing.coverImageUrl}
          title={listing.title}
          categoryIcon={listing.category.icon ?? null}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          imageClassName="transition-transform duration-base group-hover:scale-[1.02]"
        />

        {/* Slot top-left : un seul badge à la fois. URGENT (Flame)
            prime sur NOUVEAU (vert). Pas d'empilement — l'œil doit
            attraper UN signal, pas déchiffrer une pile. */}
        {listing.isUrgent ? (
          <span className="pointer-events-none absolute left-2 top-2 z-20 inline-flex items-center gap-1 rounded-full bg-hot/90 px-2 py-[3px] font-display text-[10px] font-extrabold uppercase tracking-[0.08em] text-white shadow">
            <Flame className="h-3 w-3" aria-hidden />
            Urgent
          </span>
        ) : showNewBadge ? (
          <Badge variant="new" className="pointer-events-none absolute left-2 top-2 z-20 shadow">
            Nouveau
          </Badge>
        ) : null}

        {showTypeChip && (
          <span className="pointer-events-none absolute bottom-2 left-2 z-20">
            <ListingTypeChip type={listing.type} />
          </span>
        )}

        {photoCount > 1 && (
          <span
            className="pointer-events-none absolute bottom-2 right-2 z-20 inline-flex items-center gap-0.5 rounded-full bg-black/65 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow backdrop-blur tabular-nums"
            aria-label={`${photoCount} photos`}
          >
            <Images className="h-3 w-3" aria-hidden />
            {photoCount}
          </span>
        )}
      </div>

      <Link
        href={`/annonces/${listing.slug}`}
        className="block active:scale-[0.99]"
      >
        {/* Padding body : 9/11/10px = cadence handoff. Pas de space-y :
            on laisse les `leading-*` et margin individuels faire le
            rythme vertical (plus fin qu'un gap uniforme). */}
        <div className="min-w-0 px-[11px] pb-[10px] pt-[9px]">
          <p className="truncate font-display text-[15px] font-extrabold leading-tight tracking-tight text-peyi-orange-700">
            {priceLabel}
          </p>
          <h3 className="mt-0.5 line-clamp-2 font-display text-[13px] font-bold leading-snug text-ink-900 group-hover:text-peyi-orange-800">
            {listing.title}
          </h3>
          <p className="mt-1 flex items-center gap-1 truncate text-[11px] text-ink-500">
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
      <div className="absolute right-2 top-2 z-30">
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
