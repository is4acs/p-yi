"use client";

import Image from "next/image";
import Link from "next/link";
import { Clock, MapPin } from "lucide-react";

import {
  ACTIVITY_CATEGORIES,
  formatDuration,
} from "@/lib/activities/labels";
import type { ActivityFeature } from "@/lib/activities/geojson";
import { isPracticableNow } from "@/lib/activities/seasons";
import { formatPrice } from "@/lib/format";
import { isRenderableImageUrl } from "@/lib/images";
import { cn } from "@/lib/utils";
import { useLocale, useMessages } from "@/components/soleil/I18nProvider";
import { tFormat } from "@/lib/i18n/tformat";

/**
 * Card compacte d'une activité pour la liste de l'explorateur (split view
 * desktop / bottom sheet mobile). Toutes les infos différenciantes — mode
 * d'accès et saison — sont visibles ICI, sans ouvrir la fiche.
 */

// Micro-PNG 8×8 orange-100 pour `placeholder="blur"` : les thumbs viennent
// de Supabase (images distantes → pas de blur automatique possible).
export const ACTIVITY_BLUR_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAE0lEQVR4nGP8/+D0fwY8YIQoAAC6AB1RgM4mAAAAAABJRU5ErkJggg==";

type Props = {
  feature: ActivityFeature;
  isSelected?: boolean;
  onClick?: () => void;
  /** Mode lien (pages piliers SEO) : la card devient un <Link> vers la
   *  fiche au lieu d'un bouton de sélection carte. Prime sur onClick. */
  href?: string;
  onHoverChange?: (hovering: boolean) => void;
  className?: string;
};

export function ActivityCard({
  feature,
  isSelected = false,
  onClick,
  href,
  onHoverChange,
  className,
}: Props) {
  const t = useMessages();
  const locale = useLocale();
  const props = feature.properties;
  const category = ACTIVITY_CATEGORIES[props.category];
  const practicable = isPracticableNow(props.seasons);
  const allYear = props.seasons.length === 0 || props.seasons.includes("ALL_YEAR");
  const duration = formatDuration(props.durationMinutes, locale);

  return (
    <article
      className={cn(
        "group relative flex gap-3 rounded-[14px] border-[1.5px] bg-soleil-input p-2.5 text-soleil-forest transition duration-base dark:bg-soleil-forest dark:text-soleil-cream",
        isSelected
          ? "border-soleil-orange shadow-md ring-1 ring-soleil-orange"
          : "border-soleil-border hover:border-soleil-forest dark:border-soleil-border-d dark:hover:border-soleil-cream",
        className,
      )}
      onMouseEnter={onHoverChange ? () => onHoverChange(true) : undefined}
      onMouseLeave={onHoverChange ? () => onHoverChange(false) : undefined}
    >
      {/* Visuel : thumb Supabase ou placeholder catégorie. */}
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[10px] sm:w-28">
        {isRenderableImageUrl(props.thumbUrl) ? (
          <Image
            src={props.thumbUrl}
            alt=""
            fill
            sizes="112px"
            placeholder="blur"
            blurDataURL={ACTIVITY_BLUR_DATA_URL}
            className="object-cover transition duration-base group-hover:scale-105"
          />
        ) : (
          <div
            aria-hidden
            className="flex h-full w-full items-center justify-center"
            style={{ backgroundColor: `${category.color}22` }}
          >
            <MapPin
              className="h-7 w-7"
              style={{ color: category.color }}
              aria-hidden
            />
          </div>
        )}
        {props.isFree && (
          <span className="absolute left-1 top-1 rounded-[7px] bg-soleil-valid px-1.5 py-0.5 text-[10px] font-extrabold text-soleil-forest dark:bg-soleil-valid-d">
            {t.common.free}
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-sm font-bold leading-snug">
            {href ? (
              <Link
                href={href}
                className="focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring after:absolute after:inset-0 after:content-['']"
              >
                {props.name}
              </Link>
            ) : onClick ? (
              <button
                type="button"
                onClick={onClick}
                className="text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring after:absolute after:inset-0 after:content-['']"
              >
                {props.name}
              </button>
            ) : (
              props.name
            )}
          </h3>
          {!props.isFree && props.priceMinCents != null && (
            <span className="shrink-0 text-xs font-extrabold text-soleil-otext dark:text-soleil-otext-d">
              {tFormat(t.act.from, {
                price: formatPrice(props.priceMinCents / 100),
              })}
            </span>
          )}
        </div>

        <p className="flex items-center gap-1 text-xs text-soleil-muted2 dark:text-soleil-muted-d">
          <MapPin className="h-3 w-3 shrink-0" aria-hidden />
          <span className="truncate">{props.cityName}</span>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1 truncate">
            <span
              aria-hidden
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: category.color }}
            />
            {t.act.categories[props.category]}
          </span>
          {duration && (
            <>
              <span aria-hidden>·</span>
              <span className="inline-flex shrink-0 items-center gap-0.5">
                <Clock className="h-3 w-3" aria-hidden />
                {duration}
              </span>
            </>
          )}
        </p>

        {/* Accès + saison : le différenciant, toujours visible. */}
        <div className="mt-auto flex flex-wrap items-center gap-1">
          {props.accessModes.map((mode) => (
            <span
              key={mode}
              title={t.act.accessDesc[mode]}
              className="inline-flex items-center rounded-[7px] border-[1.5px] border-soleil-border px-1.5 py-0.5 text-[10px] font-bold dark:border-soleil-border-d"
            >
              {t.act.access[mode]}
            </span>
          ))}
          {!allYear && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-[7px] px-1.5 py-0.5 text-[10px] font-bold",
                practicable
                  ? "bg-soleil-valid text-soleil-forest dark:bg-soleil-valid-d"
                  : "bg-soleil-promo text-soleil-otext dark:bg-soleil-promo-d dark:text-soleil-otext-d",
              )}
            >
              {practicable ? t.act.inSeasonBadge : t.act.offSeasonBadge}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
