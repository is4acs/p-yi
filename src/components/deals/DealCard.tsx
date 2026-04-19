import Link from "next/link";
import {
  AlertTriangle,
  Clock,
  Eye,
  MapPin,
  MessageSquare,
  Store,
} from "lucide-react";
import type { VoteType } from "@prisma/client";

import { cn } from "@/lib/utils";
import { formatPrice, formatRelativeTime } from "@/lib/format";
import type { DealCardData } from "@/lib/deals/queries";
import { PriceTag } from "./PriceTag";
import { CategoryChip } from "./CategoryChip";
import { CommuneChip } from "./CommuneChip";
import { DealCover } from "./DealCover";
import { VoteButtons } from "./VoteButtons";
import { FavoriteButton } from "./FavoriteButton";

export type { DealCardData };

type Props = {
  deal: DealCardData;
  currentUserId?: string | null;
  myVote?: VoteType | null;
  isFavorited?: boolean;
  // `full` (défaut) : carte mockup Dealabs S30 — vote à gauche, image
  //   séparée (sm:+), posted-by en pied. Utilisée sur `/bons-plans` et
  //   `/profil/favoris`.
  // `compact` : ancienne carte — image 96/112 + body + vote à droite.
  //   Conservée pour le rail horizontal sur la home (`w-[85vw]`) où
  //   l'espace ne permet pas la disposition en 3 colonnes.
  variant?: "full" | "compact";
  className?: string;
};

// On ne montre le warning d'expiration que si l'échéance est imminente.
// Au-delà de 3 jours, la carte est "saine" — afficher une alerte partout
// rendrait l'UI anxiogène et noierait les vraies urgences (ex. "plus que
// 6h"). Le seuil aligne avec la mockup (Deal 4 : "Expire dans 3 jours").
const EXPIRY_WARNING_MS = 3 * 24 * 60 * 60 * 1000;

function initialFrom(s: string | null | undefined): string {
  return s?.trim()?.[0]?.toUpperCase() ?? "?";
}

function expiryWarning(expiresAt: Date | null): string | null {
  if (!expiresAt) return null;
  const diff = expiresAt.getTime() - Date.now();
  if (diff <= 0) return "Expiré";
  if (diff > EXPIRY_WARNING_MS) return null;
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days >= 1) return `Expire dans ${days} j`;
  const hours = Math.max(1, Math.floor(diff / (60 * 60 * 1000)));
  return `Expire dans ${hours} h`;
}

/**
 * Tag marchand (Cdiscount, Amazon, Carrefour Matoury, …). La mockup
 * hardcode une couleur par marque — on n'a pas cette donnée côté DB,
 * donc on binarise : store local (Carrefour Matoury, Hyper U Cayenne) =
 * vert Péyi, marchand national (Amazon, Fnac) = ink-900. Ça suffit à
 * signaler visuellement le "local vs national" sans payload custom.
 */
function MerchantTag({
  name,
  isLocal,
}: {
  name: string;
  isLocal: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 text-[10px] uppercase tracking-[0.06em] text-muted-foreground">
      <span
        className={cn(
          "shrink-0 rounded-xs px-1.5 py-0.5 font-mono font-semibold text-white",
          isLocal ? "bg-peyi-green-700" : "bg-ink-900",
        )}
      >
        {name}
      </span>
      {isLocal && (
        <span className="truncate font-mono font-semibold text-peyi-green-700">
          Local · En magasin
        </span>
      )}
    </div>
  );
}

export function DealCard({
  deal,
  currentUserId,
  myVote = null,
  isFavorited = false,
  variant = "full",
  className,
}: Props) {
  const sellerName = deal.store?.name ?? deal.merchant?.name ?? null;
  const isLocalStore = Boolean(deal.store);
  const placeholderEmoji = deal.category.icon ?? null;
  const placeholderLabel = sellerName ?? deal.title;
  // `storeLogoUrl` sert de cover dégradée quand l'auteur n'a pas
  // uploadé de photo (cas majoritaire sur l'app). On privilégie le
  // logo du magasin physique ; à défaut on retombe sur le marchand
  // online (Amazon, Fnac…) qui en a souvent un aussi.
  const storeLogoUrl =
    deal.store?.logoUrl ?? deal.merchant?.logoUrl ?? null;

  const isAuthor = currentUserId === deal.authorId;
  const isAuthenticated = Boolean(currentUserId);
  const canVote = isAuthenticated && !isAuthor;
  const voteHint = !isAuthenticated
    ? "Connecte-toi pour voter."
    : isAuthor
    ? "Tu ne peux pas voter sur ton propre bon plan."
    : undefined;
  const canFavorite = isAuthenticated;
  const favoriteHint = !isAuthenticated
    ? "Connecte-toi pour sauvegarder."
    : undefined;

  // ───────── variant = "compact" (home carousel, ancien layout S28) ─────────
  if (variant === "compact") {
    const fallbackSellerName = sellerName ?? "Vendeur non précisé";
    return (
      <article
        className={cn(
          "group flex items-stretch gap-3 rounded-xl border border-border bg-card p-3 shadow-sm transition hover:border-peyi-orange-300 hover:shadow-md",
          className,
        )}
      >
        <div className="relative h-24 w-24 shrink-0 sm:h-28 sm:w-28">
          <Link
            href={`/bons-plans/${deal.slug}`}
            className="block h-full w-full active:scale-[0.99]"
          >
            <DealCover
              coverImageUrl={deal.coverImageUrl}
              storeLogoUrl={storeLogoUrl}
              emoji={placeholderEmoji}
              label={placeholderLabel}
              className="h-full w-full"
            />
          </Link>
          <div className="absolute right-1 top-1">
            <FavoriteButton
              dealId={deal.id}
              initialFavorited={isFavorited}
              canFavorite={canFavorite}
              disabledHint={favoriteHint}
              size="sm"
            />
          </div>
        </div>

        <Link
          href={`/bons-plans/${deal.slug}`}
          className="flex min-w-0 flex-1 transition active:scale-[0.99]"
        >
          <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
            <div className="min-w-0 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Store className="h-3 w-3 shrink-0" aria-hidden />
                <span className="truncate">{fallbackSellerName}</span>
              </div>
              <h3 className="line-clamp-2 font-display text-sm font-semibold leading-tight text-foreground group-hover:text-peyi-orange-700">
                {deal.title}
              </h3>
            </div>

            <PriceTag
              price={deal.price.toString()}
              originalPrice={deal.originalPrice?.toString() ?? null}
              discountPercent={deal.discountPercent ?? null}
              isFree={deal.isFree}
              size="sm"
            />

            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
              <CategoryChip name={deal.category.name} icon={deal.category.icon} />
              {deal.city && <CommuneChip name={deal.city.name} />}
              <span className="inline-flex items-center gap-0.5">
                <MessageSquare className="h-3 w-3" aria-hidden />
                {deal.commentCount}
              </span>
              <span className="inline-flex items-center gap-0.5">
                <Clock className="h-3 w-3" aria-hidden />
                {formatRelativeTime(deal.publishedAt)}
              </span>
            </div>
          </div>
        </Link>

        <div className="flex shrink-0 items-center">
          <VoteButtons
            dealId={deal.id}
            temperature={deal.temperature}
            upvotes={deal.upvotes}
            downvotes={deal.downvotes}
            myVote={myVote}
            canVote={canVote}
            disabledHint={voteHint}
            variant="compact"
          />
        </div>
      </article>
    );
  }

  // ───────── variant = "full" (S30, mockup Dealabs-style) ─────────
  // Layout responsive :
  //   mobile (<sm)  : [vote-rail 56 | body] — image miniature 80×80
  //                   intégrée dans la première ligne du body.
  //   sm+ (≥640px) : [vote-rail 56 | image 140×110 | body flex-1] —
  //                  trois zones distinctes comme Dealabs.
  //
  // Toute la carte est cliquable via un `::before absolute inset-0` sur
  // le lien du titre — pattern classique ("card link" pattern) qui laisse
  // screen readers annoncer uniquement le titre comme label. Vote-rail
  // et bouton favoris sont montés avec `relative z-10` pour rester
  // interactifs au-dessus de l'overlay.
  const warning = expiryWarning(deal.expiresAt ?? null);

  return (
    <article
      className={cn(
        // S33 : padding et gap réduits mobile (`p-2.5 gap-2.5` au lieu
        // de `p-3 gap-3`) pour compenser les "trous" visuels qui
        // apparaissaient quand le vote-rail (~80px hauteur) dépassait
        // la hauteur du body sur des deals au titre court — bug
        // signalé via screenshot iPhone user. `items-stretch` maintient
        // la symétrie verticale des deux colonnes.
        "group relative flex items-stretch gap-2.5 rounded-xl border border-border bg-card p-2.5 shadow-sm transition hover:border-peyi-orange-300 hover:shadow-md sm:gap-4 sm:p-4",
        className,
      )}
    >
      {/* Vote rail — colonne gauche, toujours visible, z-10 pour passer
          au-dessus de l'overlay du titre. */}
      <div className="relative z-10 shrink-0">
        <VoteButtons
          dealId={deal.id}
          temperature={deal.temperature}
          upvotes={deal.upvotes}
          downvotes={deal.downvotes}
          myVote={myVote}
          canVote={canVote}
          disabledHint={voteHint}
          variant="rail"
        />
      </div>

      {/* Image desktop — 140×110, cachée mobile (remplacée par la vignette
          80×80 intégrée au body ci-dessous). aria-hidden + tabIndex=-1 :
          c'est un doublon navigationnel du titre, on évite les relectures
          inutiles en TAB. */}
      <div
        aria-hidden
        className="hidden shrink-0 sm:block"
      >
        <DealCover
          coverImageUrl={deal.coverImageUrl}
          storeLogoUrl={storeLogoUrl}
          emoji={placeholderEmoji}
          label={placeholderLabel}
          className="h-[110px] w-[140px]"
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {sellerName && <MerchantTag name={sellerName} isLocal={isLocalStore} />}

        {/* Ligne titre + image mobile. Sur sm:+ on passe en block pour
            que le titre prenne toute la largeur du body (l'image est
            déjà rendue plus haut en colonne séparée).

            S33 : image mobile 72×72 (vs 80×80 avant) + gap-2.5 (vs
            gap-3) — gagne 14px de largeur pour titre/prix, ce qui
            évite les troncatures (ex. `449,00 €` qui se coupait au
            bord du viewport sur les screenshots iPhone). */}
        <div className="flex items-start gap-2.5 sm:block sm:gap-0">
          <div aria-hidden className="shrink-0 sm:hidden">
            <DealCover
              coverImageUrl={deal.coverImageUrl}
              storeLogoUrl={storeLogoUrl}
              emoji={placeholderEmoji}
              label={placeholderLabel}
              className="h-[72px] w-[72px]"
            />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <h3 className="line-clamp-2 font-display text-sm font-bold leading-[1.25] tracking-tight text-ink-900 sm:text-[17px]">
              <Link
                href={`/bons-plans/${deal.slug}`}
                className="transition group-hover:text-peyi-orange-700 before:absolute before:inset-0 before:content-['']"
              >
                {deal.title}
              </Link>
            </h3>

            {/* Prices — typo mockup : `now` display 24px orange-700,
                `was` 14px barré, `pct` pill rouge. Sur mobile on réduit
                pour conserver un rythme horizontal. */}
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              {deal.isFree ? (
                <span className="inline-flex items-center rounded-md bg-peyi-green-100 px-2 py-0.5 font-display text-base font-extrabold text-peyi-green-800 sm:text-xl">
                  Gratuit
                </span>
              ) : (
                <>
                  <span className="font-display text-lg font-extrabold tracking-tight text-peyi-orange-700 sm:text-2xl">
                    {formatPrice(deal.price.toString())}
                  </span>
                  {deal.originalPrice != null && (
                    <span className="text-xs text-muted-foreground line-through sm:text-sm">
                      {formatPrice(deal.originalPrice.toString())}
                    </span>
                  )}
                  {deal.discountPercent != null && deal.discountPercent > 0 && (
                    <span className="rounded-xs bg-hot px-1.5 py-0.5 font-display text-[10px] font-extrabold text-white sm:px-2 sm:py-0.5 sm:text-xs">
                      −{deal.discountPercent}%
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Description — desktop uniquement (mobile déjà bien rempli).
            line-clamp-2 pour contenir la carte à ~2 lignes additionnelles
            quoi qu'écrive l'auteur. */}
        {deal.description && (
          <p className="hidden text-[13px] leading-[1.5] text-ink-700 line-clamp-2 sm:block">
            {deal.description}
          </p>
        )}

        {/* Meta row — horodatage toujours visible, vues et ville en sm:+
            pour éviter le "tetris" mobile. Warning d'expiration en
            peyi-red pour capter l'œil. */}
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground sm:text-xs">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" aria-hidden />
            {formatRelativeTime(deal.publishedAt)}
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageSquare className="h-3 w-3" aria-hidden />
            {deal.commentCount}
          </span>
          {deal.viewCount > 0 && (
            <span className="hidden items-center gap-1 sm:inline-flex">
              <Eye className="h-3 w-3" aria-hidden />
              {new Intl.NumberFormat("fr-FR").format(deal.viewCount)}
            </span>
          )}
          {deal.city && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" aria-hidden />
              {deal.city.name}
            </span>
          )}
          {warning && (
            <span className="inline-flex items-center gap-1 font-semibold text-hot">
              <AlertTriangle className="h-3 w-3" aria-hidden />
              {warning}
            </span>
          )}
        </div>

        {/* Posted-by — desktop uniquement. Avatar gradient (orange→vert
            Péyi) + pseudo en font-display. Sur mobile on tomberait en
            3e ligne meta — trop chargé, on garde l'info pour le détail. */}
        {deal.author && (
          <div className="mt-1 hidden items-center gap-2 font-mono text-[11px] text-muted-foreground sm:flex">
            <span
              aria-hidden
              className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-peyi-orange to-peyi-green font-display text-[10px] font-extrabold text-white"
            >
              {initialFrom(deal.author.username)}
            </span>
            <span className="truncate">
              par{" "}
              <b className="font-display text-[12px] font-bold text-ink-900">
                {deal.author.username}
              </b>
              {deal.author.city && (
                <span className="text-muted-foreground">
                  {" · "}
                  {deal.author.city.name}
                </span>
              )}
            </span>
          </div>
        )}
      </div>

      {/* FavoriteButton — absolute top-right, toujours au-dessus de
          l'overlay titre (z-10). */}
      <div className="absolute right-2 top-2 z-10 sm:right-3 sm:top-3">
        <FavoriteButton
          dealId={deal.id}
          initialFavorited={isFavorited}
          canFavorite={canFavorite}
          disabledHint={favoriteHint}
          size="sm"
        />
      </div>
    </article>
  );
}
