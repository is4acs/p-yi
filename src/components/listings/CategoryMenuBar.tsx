"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { useMessages } from "@/components/soleil/I18nProvider";
import { tFormat } from "@/lib/i18n/tformat";
import { cn } from "@/lib/utils";

/**
 * CategoryMenuBar — méga-menu de catégories sur le modèle leboncoin.fr :
 * barre horizontale des familles sous l'en-tête ; au survol/clic d'une
 * famille, panneau déroulant avec rail gauche (nom de la famille),
 * « Tout {Famille} » puis les sous-catégories en colonnes, « Voir tout »
 * en pied de liste. « Bons plans ! » ferme la barre, clin d'œil compris.
 *
 * Responsive :
 *  - desktop (lg+) : barre centrée, panneau absolu pleine largeur sous
 *    la barre, ouverture au survol (petit délai) ou au clic ;
 *  - mobile : barre en défilement horizontal, le panneau s'ouvre en
 *    accordéon sous la barre (pousse le contenu), grandes zones
 *    tactiles.
 *
 * Données sérialisables passées par le serveur (noms déjà traduits,
 * compteurs agrégés). La sélection navigue via l'URL — le menu se
 * referme automatiquement après navigation.
 */

export type MenuChild = { slug: string; name: string; count: number };
export type MenuFamily = {
  slug: string;
  name: string;
  /** Compteur agrégé (famille + sous-catégories). */
  count: number;
  children: MenuChild[];
};

const HOVER_OPEN_DELAY_MS = 120;

export function CategoryMenuBar({
  families,
  activeSlug,
}: {
  families: MenuFamily[];
  /** Slug de la catégorie active (famille ou sous-catégorie). */
  activeSlug: string | null;
}) {
  const t = useMessages();
  const [openSlug, setOpenSlug] = React.useState<string | null>(null);
  const hoverTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = React.useRef<HTMLElement | null>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Fermer après navigation (une catégorie vient d'être choisie).
  const urlKey = `${pathname}?${searchParams.toString()}`;
  const lastUrlRef = React.useRef(urlKey);
  React.useEffect(() => {
    if (lastUrlRef.current !== urlKey) {
      lastUrlRef.current = urlKey;
      setOpenSlug(null);
    }
  }, [urlKey]);

  React.useEffect(() => {
    if (!openSlug) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpenSlug(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenSlug(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openSlug]);

  const clearHoverTimer = () => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  };

  // Survol desktop uniquement — sur tactile, seul le clic compte.
  const scheduleOpen = (slug: string) => {
    if (typeof window !== "undefined" && !window.matchMedia("(hover: hover)").matches) {
      return;
    }
    clearHoverTimer();
    hoverTimer.current = setTimeout(() => setOpenSlug(slug), HOVER_OPEN_DELAY_MS);
  };

  const isFamilyActive = (family: MenuFamily) =>
    activeSlug === family.slug ||
    family.children.some((child) => child.slug === activeSlug);

  const open = openSlug
    ? families.find((f) => f.slug === openSlug) ?? null
    : null;

  return (
    <nav
      ref={rootRef}
      aria-label={t.listings.categoriesEyebrow}
      className="relative border-b border-soleil-line dark:border-soleil-line-d"
      onMouseLeave={() => {
        clearHoverTimer();
        setOpenSlug(null);
      }}
    >
      <div className="scrollbar-hide -mx-5 flex items-center gap-1 overflow-x-auto px-5 lg:mx-0 lg:flex-wrap lg:justify-center lg:gap-0 lg:overflow-visible lg:px-0">
        {families.map((family) => {
          const active = isFamilyActive(family);
          const opened = openSlug === family.slug;
          const itemClass = cn(
            "relative flex min-h-[44px] flex-none items-center whitespace-nowrap px-2.5 text-[13.5px] transition lg:px-3",
            active || opened
              ? "font-extrabold text-soleil-forest dark:text-soleil-cream"
              : "font-semibold text-soleil-muted2 hover:text-soleil-forest dark:text-soleil-muted-d dark:hover:text-soleil-cream",
            // Soulignement épais de l'item actif / ouvert (leboncoin).
            (active || opened) &&
              "after:absolute after:inset-x-2.5 after:bottom-0 after:h-[2.5px] after:rounded-full after:bg-soleil-forest dark:after:bg-soleil-cream lg:after:inset-x-3",
          );

          if (family.children.length === 0) {
            // Famille sans sous-catégories : navigation directe.
            return (
              <Link
                key={family.slug}
                href={`/annonces?category=${encodeURIComponent(family.slug)}`}
                scroll={false}
                onMouseEnter={clearHoverTimer}
                className={itemClass}
              >
                {family.name}
              </Link>
            );
          }
          return (
            <button
              key={family.slug}
              type="button"
              aria-expanded={opened}
              onMouseEnter={() => scheduleOpen(family.slug)}
              onClick={() => setOpenSlug(opened ? null : family.slug)}
              className={itemClass}
            >
              {family.name}
            </button>
          );
        })}
        <Link
          href="/bons-plans"
          onMouseEnter={clearHoverTimer}
          className="flex min-h-[44px] flex-none items-center whitespace-nowrap px-2.5 text-[13.5px] font-extrabold text-soleil-otext transition hover:underline dark:text-soleil-otext-d lg:px-3"
        >
          {t.listings.dealsBang}
        </Link>
      </div>

      {open && (
        <div className="left-0 right-0 top-full z-30 overflow-hidden border-t border-soleil-line bg-soleil-paper dark:border-soleil-line-d dark:bg-soleil-forest lg:absolute lg:rounded-b-[20px] lg:border lg:border-soleil-border lg:shadow-2xl dark:lg:border-soleil-border-d">
          <div className="flex">
            {/* Rail gauche — nom de la famille (desktop). */}
            <div className="hidden w-52 flex-none bg-soleil-sand/60 p-5 dark:bg-soleil-night/40 lg:block">
              <span className="border-l-[3px] border-soleil-forest pl-3 font-display text-[17px] font-extrabold text-soleil-forest dark:border-soleil-cream dark:text-soleil-cream">
                {open.name}
              </span>
            </div>

            <div className="min-w-0 flex-1 p-4 lg:p-6">
              <Link
                href={`/annonces?category=${encodeURIComponent(open.slug)}`}
                scroll={false}
                className="inline-flex min-h-[40px] items-center font-display text-[15.5px] font-extrabold text-soleil-forest hover:underline dark:text-soleil-cream"
              >
                {tFormat(t.listings.allIn, { name: open.name })}
                <span className="ml-2 font-mono text-[11.5px] font-bold text-soleil-strike dark:text-soleil-strike-d">
                  {open.count}
                </span>
              </Link>

              <ul className="mt-1 gap-x-8 lg:columns-2 xl:columns-3">
                {open.children.map((child) => (
                  <li key={child.slug} className="break-inside-avoid">
                    <Link
                      href={`/annonces?category=${encodeURIComponent(child.slug)}`}
                      scroll={false}
                      className={cn(
                        "flex min-h-[40px] items-center justify-between gap-3 text-sm transition hover:underline",
                        activeSlug === child.slug
                          ? "font-extrabold text-soleil-forest dark:text-soleil-cream"
                          : "font-medium text-soleil-body hover:text-soleil-forest dark:text-soleil-body-d dark:hover:text-soleil-cream",
                      )}
                    >
                      <span className="min-w-0 truncate">{child.name}</span>
                      <span className="font-mono text-[11px] text-soleil-strike dark:text-soleil-strike-d">
                        {child.count}
                      </span>
                    </Link>
                  </li>
                ))}
                <li className="break-inside-avoid">
                  <Link
                    href={`/annonces?category=${encodeURIComponent(open.slug)}`}
                    scroll={false}
                    className="flex min-h-[40px] items-center text-sm font-bold text-soleil-otext hover:underline dark:text-soleil-otext-d"
                  >
                    {t.listings.seeAllOf}
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
