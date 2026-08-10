"use client";

import Image from "next/image";
import { Clock, MapPin } from "lucide-react";

import {
  ACCESS_MODES,
  ACTIVITY_CATEGORIES,
  formatDuration,
} from "@/lib/activities/labels";
import type { ActivityFeature } from "@/lib/activities/geojson";
import { isPracticableNow } from "@/lib/activities/seasons";
import { formatPrice } from "@/lib/format";
import { isRenderableImageUrl } from "@/lib/images";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
  onHoverChange?: (hovering: boolean) => void;
  className?: string;
};

export function ActivityCard({
  feature,
  isSelected = false,
  onClick,
  onHoverChange,
  className,
}: Props) {
  const props = feature.properties;
  const category = ACTIVITY_CATEGORIES[props.category];
  const practicable = isPracticableNow(props.seasons);
  const allYear = props.seasons.length === 0 || props.seasons.includes("ALL_YEAR");
  const duration = formatDuration(props.durationMinutes);

  return (
    <article
      className={cn(
        "group relative flex gap-3 rounded-md border bg-card p-2.5 transition duration-base",
        isSelected
          ? "border-peyi-orange-400 shadow-md ring-1 ring-peyi-orange-400"
          : "border-border hover:border-peyi-orange-300 hover:shadow-sm",
        className,
      )}
      onMouseEnter={onHoverChange ? () => onHoverChange(true) : undefined}
      onMouseLeave={onHoverChange ? () => onHoverChange(false) : undefined}
    >
      {/* Visuel : thumb Supabase ou placeholder catégorie. */}
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-sm sm:w-28">
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
            className="flex h-full w-full items-center justify-center text-3xl"
            style={{ backgroundColor: `${category.color}22` }}
          >
            {category.emoji}
          </div>
        )}
        {props.isFree && (
          <Badge variant="new" className="absolute left-1 top-1">
            Gratuit
          </Badge>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 font-display text-sm font-bold leading-snug">
            {onClick ? (
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
            <span className="shrink-0 font-mono text-xs font-semibold text-peyi-orange-700">
              dès {formatPrice(props.priceMinCents / 100)}
            </span>
          )}
        </div>

        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" aria-hidden />
          <span className="truncate">{props.cityName}</span>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1 truncate">
            <span
              aria-hidden
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: category.color }}
            />
            {category.label}
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
          {props.accessModes.map((mode) => {
            const meta = ACCESS_MODES[mode];
            return (
              <span
                key={mode}
                title={meta.description}
                className="inline-flex items-center gap-1 rounded-xs border border-ink-100 bg-white px-1.5 py-0.5 font-mono text-[10px] font-semibold text-ink-700"
              >
                <span aria-hidden>{meta.emoji}</span>
                {meta.label}
              </span>
            );
          })}
          {!allYear && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-xs px-1.5 py-0.5 font-mono text-[10px] font-semibold",
                practicable
                  ? "bg-peyi-green-50 text-peyi-green-700"
                  : "bg-warning/15 text-ink-700",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "inline-block h-1.5 w-1.5 rounded-full",
                  practicable ? "bg-peyi-green-500" : "bg-warning",
                )}
              />
              {practicable ? "En saison" : "Hors saison"}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
