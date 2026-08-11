"use client";

import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Clock,
  ExternalLink,
  Gauge,
  MapPin,
  Navigation,
  Phone,
  Ticket,
} from "lucide-react";

import { ACTIVITY_BLUR_DATA_URL } from "@/components/activities/ActivityCard";
import {
  ACCESS_MODES,
  ACTIVITY_CATEGORIES,
  DIFFICULTIES,
  formatActivityPrice,
  formatDuration,
  SEASONS,
} from "@/lib/activities/labels";
import {
  DAY_LABELS,
  DAY_KEYS,
  isOpenAt,
  parseOpeningHours,
  todayRanges,
} from "@/lib/activities/opening-hours";
import { isPracticableNow } from "@/lib/activities/seasons";
import type { ActivityDetailPayload } from "@/lib/activities/types";
import { isRenderableImageUrl } from "@/lib/images";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Contenu de la fiche activité, partagé entre le panneau desktop (overlay
 * sur la carte) et le bottom sheet mobile. Ordre des sections imposé par
 * la spec : photos → identité → ACCÈS → SAISON → durée/difficulté/prix →
 * description → horaires → CTA → lien fiche complète.
 */

/** WhatsApp veut des digits internationaux : "0694 12 34 56" → "594694123456". */
function whatsappHref(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  const international = digits.startsWith("0") ? `594${digits.slice(1)}` : digits;
  return `https://wa.me/${international}`;
}

function directionsHref(detail: ActivityDetailPayload): string {
  // Le point de départ (parking, dégrad, embarcadère…) prime sur les
  // coordonnées du lieu : c'est là qu'on gare la voiture.
  const destination = detail.startPoint
    ? `${detail.startPoint}, Guyane française`
    : `${detail.latitude},${detail.longitude}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

export function ActivityDetailContent({
  detail,
  showFullPageLink = true,
}: {
  detail: ActivityDetailPayload;
  /** false sur /activites/[slug] : la fiche complète, c'est déjà ici. */
  showFullPageLink?: boolean;
}) {
  const category = ACTIVITY_CATEGORIES[detail.category];
  const practicable = isPracticableNow(detail.seasons);
  const allYear =
    detail.seasons.length === 0 || detail.seasons.includes("ALL_YEAR");
  const seasonLabels = detail.seasons
    .filter((season) => season !== "ALL_YEAR")
    .map((season) => SEASONS[season].label);
  const duration = formatDuration(detail.durationMinutes);
  const hours = parseOpeningHours(detail.openingHours);
  const openNow = hours ? isOpenAt(hours) : null;
  const ranges = hours ? todayRanges(hours) : [];
  const images = detail.images.filter((image) =>
    isRenderableImageUrl(image.url),
  );
  // Cible du CTA principal : la billetterie si elle existe, sinon le site de
  // l'opérateur quand la réservation est obligatoire — sans quoi la fiche
  // annonce « réservation obligatoire » sans dire où réserver.
  const bookingHref =
    detail.bookingUrl ?? (detail.bookingRequired ? detail.website : null);

  return (
    <div className="flex flex-col gap-4">
      {/* 1. Carrousel photos — scroll-snap natif, pas de lib. */}
      {images.length > 0 ? (
        <div className="relative -mx-4 -mt-4 sm:mx-0 sm:mt-0 sm:overflow-hidden sm:rounded-md">
          <div className="flex snap-x snap-mandatory overflow-x-auto">
            {images.map((image, index) => (
              <div
                key={image.id}
                className="relative aspect-[4/3] w-full shrink-0 snap-center"
              >
                <Image
                  src={image.url}
                  alt={image.altText}
                  fill
                  sizes="(min-width: 1024px) 384px, 100vw"
                  placeholder="blur"
                  blurDataURL={ACTIVITY_BLUR_DATA_URL}
                  className="object-cover"
                  priority={index === 0}
                />
              </div>
            ))}
          </div>
          {images.length > 1 && (
            <span className="absolute bottom-2 right-2 rounded-full bg-ink-900/70 px-2 py-0.5 font-mono text-[11px] font-semibold text-white">
              {images.length} photos
            </span>
          )}
          {/* Crédit photo : condition des licences Creative Commons, pas
              une politesse. Discret mais toujours lisible. */}
          {images[0]?.credit && (
            <p className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-ink-900/70 to-transparent px-3 pb-1 pt-6 text-[10px] text-white/90">
              {images[0].credit}
            </p>
          )}
        </div>
      ) : (
        <div
          aria-hidden
          className="-mx-4 -mt-4 flex aspect-[4/3] items-center justify-center sm:mx-0 sm:mt-0 sm:rounded-[14px]"
          style={{ backgroundColor: `${category.color}22` }}
        >
          <MapPin
            className="h-10 w-10"
            style={{ color: category.color }}
            aria-hidden
          />
        </div>
      )}

      {/* 2. Identité. */}
      <div>
        <h2 className="font-display text-xl font-extrabold leading-tight">
          {detail.name}
        </h2>
        <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-soleil-muted2 dark:text-soleil-muted-d">
          <MapPin className="h-3.5 w-3.5" aria-hidden />
          {detail.city.name}
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1">
            <span
              aria-hidden
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: category.color }}
            />
            {category.label}
          </span>
        </p>
        <p className="mt-2 text-sm text-soleil-body dark:text-soleil-body-d">
          {detail.tagline}
        </p>
      </div>

      {/* 3. Bandeau ACCÈS — le différenciant n° 1. */}
      <section
        aria-label="Mode d'accès"
        className="rounded-[14px] bg-soleil-sand p-3 dark:bg-soleil-forest"
      >
        <div className="flex flex-wrap items-center gap-2">
          {detail.accessModes.map((mode) => {
            const meta = ACCESS_MODES[mode];
            return (
              <span
                key={mode}
                className="inline-flex items-center rounded-[7px] border-[1.5px] border-soleil-border bg-soleil-input px-2 py-1 text-xs font-bold dark:border-soleil-border-d dark:bg-soleil-night"
                title={meta.description}
              >
                {meta.label}
              </span>
            );
          })}
          {detail.startPoint && (
            <span className="text-xs text-soleil-muted2 dark:text-soleil-muted-d">
              Départ : {detail.startPoint}
            </span>
          )}
        </div>
        {detail.accessNote && (
          <p className="mt-2 flex items-start gap-1.5 text-xs font-medium text-soleil-body dark:text-soleil-body-d">
            <AlertTriangle
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-soleil-otext dark:text-soleil-otext-d"
              aria-hidden
            />
            {detail.accessNote}
          </p>
        )}
      </section>

      {/* 4. Bandeau SAISON — calculé sur la date du jour. */}
      <section
        aria-label="Saisonnalité"
        className={cn(
          "flex items-start gap-2 rounded-[14px] p-3 text-sm",
          practicable
            ? "bg-soleil-valid text-soleil-forest dark:bg-soleil-valid-d"
            : "bg-soleil-promo text-soleil-otext dark:bg-soleil-promo-d dark:text-soleil-otext-d",
        )}
      >
        <CalendarDays className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <div>
          <p className="font-semibold">
            {practicable
              ? "Praticable en ce moment"
              : "Déconseillé en ce moment"}
          </p>
          <p className="text-xs">
            {allYear
              ? "Accessible toute l'année."
              : `Meilleure période : ${seasonLabels.join(", ")}.`}
          </p>
        </div>
      </section>

      {/* 5. Durée, difficulté, prix. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        {duration && (
          <span className="inline-flex items-center gap-1.5">
            <Clock
              className="h-4 w-4 text-soleil-muted dark:text-soleil-muted-d"
              aria-hidden
            />
            {duration}
          </span>
        )}
        {detail.difficulty && (
          <span className="inline-flex items-center gap-1.5">
            <Gauge
              className="h-4 w-4 text-soleil-muted dark:text-soleil-muted-d"
              aria-hidden
            />
            {DIFFICULTIES[detail.difficulty].label}
          </span>
        )}
        {detail.isFree ? (
          <span className="rounded-[7px] bg-soleil-valid px-2 py-0.5 text-xs font-extrabold text-soleil-forest dark:bg-soleil-valid-d">
            Gratuit
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 font-extrabold text-soleil-otext dark:text-soleil-otext-d">
            <Ticket className="h-4 w-4" aria-hidden />
            {formatActivityPrice(detail)}
          </span>
        )}
      </div>

      {/* 6. Description (markdown simple : paragraphes). */}
      <div className="space-y-2.5 text-sm leading-relaxed text-soleil-body dark:text-soleil-body-d">
        {detail.description
          .split(/\n{2,}/)
          .filter(Boolean)
          .map((paragraph, index) => (
            <p key={index} className="whitespace-pre-line">
              {paragraph}
            </p>
          ))}
      </div>

      {/* 7. Horaires du jour + statut temps réel. */}
      {hours && (
        <section
          aria-label="Horaires"
          className="rounded-[14px] border-[1.5px] border-soleil-border p-3 dark:border-soleil-border-d"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-bold">Aujourd&apos;hui</p>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-extrabold",
                openNow
                  ? "bg-soleil-valid text-soleil-forest dark:bg-soleil-valid-d"
                  : "bg-destructive/10 text-destructive",
              )}
            >
              {openNow ? "Ouvert" : "Fermé"}
            </span>
          </div>
          <p className="mt-1 text-sm text-soleil-muted2 dark:text-soleil-muted-d">
            {ranges.length > 0
              ? ranges.map(([start, end]) => `${start} – ${end}`).join(" · ")
              : "Fermé aujourd'hui"}
          </p>
          <details className="mt-2">
            <summary className="cursor-pointer text-xs font-bold text-soleil-otext dark:text-soleil-otext-d">
              Tous les horaires
            </summary>
            <ul className="mt-1.5 space-y-0.5 text-xs text-soleil-muted2 dark:text-soleil-muted-d">
              {DAY_KEYS.map((day) => (
                <li key={day} className="flex justify-between gap-4">
                  <span>{DAY_LABELS[day]}</span>
                  <span>
                    {(hours[day] ?? []).length > 0
                      ? (hours[day] ?? [])
                          .map(([start, end]) => `${start} – ${end}`)
                          .join(" · ")
                      : "Fermé"}
                  </span>
                </li>
              ))}
            </ul>
            {hours.exceptions && hours.exceptions.length > 0 && (
              <p className="mt-1.5 text-xs italic text-soleil-muted dark:text-soleil-muted-d">
                {hours.exceptions.join(" — ")}
              </p>
            )}
          </details>
        </section>
      )}

      {/* 8. CTA. */}
      <div className="flex flex-wrap gap-2">
        {bookingHref && (
          <Button asChild variant="peyi" size="sm">
            <a href={bookingHref} target="_blank" rel="noopener noreferrer">
              <Ticket aria-hidden />
              {detail.bookingUrl ? "Réserver" : "Réserver / contacter"}
            </a>
          </Button>
        )}
        {detail.whatsapp && (
          <Button asChild variant="brand" size="sm">
            <a
              href={whatsappHref(detail.whatsapp)}
              target="_blank"
              rel="noopener noreferrer"
            >
              WhatsApp
            </a>
          </Button>
        )}
        <Button asChild variant="outline" size="sm">
          <a
            href={directionsHref(detail)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Navigation aria-hidden /> Itinéraire
          </a>
        </Button>
        {detail.phone && (
          <Button asChild variant="ghost" size="sm">
            <a href={`tel:${detail.phone.replace(/\s/g, "")}`}>
              <Phone aria-hidden /> {detail.phone}
            </a>
          </Button>
        )}
        {/* Le site n'est proposé en lien secondaire que s'il ne sert pas déjà
            de cible au bouton « Réserver / contacter ». */}
        {detail.website && bookingHref !== detail.website && (
          <Button asChild variant="ghost" size="sm">
            <a href={detail.website} target="_blank" rel="noopener noreferrer">
              <ExternalLink aria-hidden /> Site web
            </a>
          </Button>
        )}
      </div>

      {detail.bookingRequired && !detail.bookingUrl && (
        <p className="text-xs text-soleil-muted2 dark:text-soleil-muted-d">
          Réservation obligatoire — passe par l&apos;opérateur avant d&apos;y
          aller.
        </p>
      )}

      {/* 9. Fiche complète (page SEO). */}
      {showFullPageLink && (
        <Link
          href={`/activites/${detail.slug}`}
          className="inline-flex items-center gap-1.5 text-sm font-bold text-soleil-otext hover:underline dark:text-soleil-otext-d"
        >
          Voir la fiche complète
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      )}
    </div>
  );
}
