"use client";

import { ChevronDown, ChevronUp, MapPin } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatPrice as formatEuros } from "@/lib/format";

/**
 * LivePreview — aperçu temps réel de la carte publique, alimenté par les
 * valeurs du `DealForm` via onInput capté dans `DealPosterLayout`.
 *
 * Rôle : dédramatiser la publication (« à quoi ça va ressembler ? »).
 * Pattern Stripe/Linear : formulaire à gauche, preview à droite qui
 * reflète chaque keystroke. L'utilisateur cerne le titre trop long ou
 * le prix sans remise avant de cliquer "Publier" — réduit la réticence
 * et les deals de mauvaise qualité à modérer ex post.
 *
 * Miniaturisation vs `DealCard` :
 *   • vote-rail 48×(6/12/6) au lieu de 56×(7/15/7)
 *   • image 64×64 (emoji catégorie) au lieu de 140×110
 *   • typo titre 14px au lieu de 17px, prix 16px au lieu de 24px
 * Même typographie (Nunito display, JetBrains mono) pour que l'user
 * reconnaisse immédiatement la carte de production.
 *
 * Comportement défensif :
 *   • Titre vide → placeholder italique « Ton titre apparaîtra ici »
 *   • Prix non parseable → « — € »
 *   • Prix > original → ignore la remise (saisie incohérente)
 *   • Pas de category sélectionnée → emoji générique 🏷️
 */

type Category = { slug: string; name: string; icon: string | null };
type City = { slug: string; name: string };

type Props = {
  title: string;
  price: string;
  originalPrice: string;
  categorySlug: string;
  citySlug: string;
  categories: Category[];
  cities: City[];
};

function parseDecimal(s: string): number | null {
  if (!s.trim()) return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function LivePreview({
  title,
  price,
  originalPrice,
  categorySlug,
  citySlug,
  categories,
  cities,
}: Props) {
  const priceNum = parseDecimal(price);
  const originalPriceNum = parseDecimal(originalPrice);
  const hasValidDiscount =
    priceNum != null &&
    originalPriceNum != null &&
    originalPriceNum > priceNum;
  const discountPercent = hasValidDiscount
    ? Math.round((1 - priceNum! / originalPriceNum!) * 100)
    : null;

  const category = categories.find((c) => c.slug === categorySlug);
  const city = cities.find((c) => c.slug === citySlug);

  const placeholderEmoji = category?.icon ?? "🏷️";
  const isTitleEmpty = title.trim().length === 0;
  const displayTitle = isTitleEmpty ? "Ton titre apparaîtra ici" : title;

  return (
    <div>
      <div className="mb-3 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.08em] text-peyi-orange-700">
        <span
          aria-hidden
          className="inline-block h-2 w-2 animate-pulse rounded-full bg-peyi-orange-500"
        />
        Aperçu en direct
      </div>

      <article
        aria-label="Aperçu de ta publication"
        className="rounded-xl border border-border bg-card p-3 shadow-md"
      >
        <div className="flex gap-3">
          {/* Vote rail miniature (0° initial) */}
          <div className="flex w-12 shrink-0 flex-col items-center gap-0.5 rounded-md border border-border bg-muted/50 p-1">
            <span className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground/70">
              <ChevronUp className="h-3.5 w-3.5" aria-hidden />
            </span>
            <span className="font-display text-xs font-black leading-none text-peyi-orange-600">
              0°
            </span>
            <span className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground/70">
              <ChevronDown className="h-3.5 w-3.5" aria-hidden />
            </span>
          </div>

          {/* Image placeholder — emoji catégorie ou 🏷️ par défaut */}
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-gradient-to-br from-peyi-orange-100 to-peyi-orange-50 text-2xl">
            <span aria-hidden>{placeholderEmoji}</span>
            {discountPercent != null && (
              <span className="absolute left-1 top-1 rounded-xs bg-hot px-1 py-0.5 font-display text-[9px] font-extrabold leading-none text-white">
                −{discountPercent}%
              </span>
            )}
          </div>

          {/* Body miniaturisé */}
          <div className="min-w-0 flex-1 space-y-1">
            {category && (
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.06em] text-muted-foreground">
                <span aria-hidden>{category.icon ?? "📦"}</span>
                <span className="truncate font-mono font-semibold">
                  {category.name}
                </span>
              </div>
            )}
            <h3
              className={cn(
                "line-clamp-2 font-display text-[13px] font-bold leading-[1.25] tracking-tight",
                isTitleEmpty
                  ? "italic text-muted-foreground"
                  : "text-ink-900",
              )}
            >
              {displayTitle}
            </h3>
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              {priceNum != null ? (
                <span className="font-display text-base font-extrabold tracking-tight text-peyi-orange-700">
                  {formatEuros(priceNum)}
                </span>
              ) : (
                <span className="font-display text-base font-extrabold text-muted-foreground/70">
                  — €
                </span>
              )}
              {originalPriceNum != null && originalPriceNum > 0 && (
                <span className="text-xs text-muted-foreground line-through">
                  {formatEuros(originalPriceNum)}
                </span>
              )}
            </div>
            {city && (
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <MapPin className="h-3 w-3" aria-hidden />
                <span className="truncate">{city.name}</span>
              </div>
            )}
          </div>
        </div>
      </article>
    </div>
  );
}
