"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, MapPin, Tag } from "lucide-react";

import {
  ACTIVITY_CATEGORY_PILLARS,
  ACTIVITY_CITY_PILLARS,
  CORE_CITIES,
  DEAL_CATEGORY_PILLARS,
  LISTING_CATEGORY_PILLARS,
  getActivitiesCategoryPath,
  getActivitiesCityPath,
  getDealsCategoryPath,
  getDealsCityPath,
  getListingsCategoryPath,
  getListingsCityPath,
} from "@/lib/seo/local-pages";
import { cn } from "@/lib/utils";

/**
 * Bloc d'exploration locale de la home.
 *
 * Contrainte double, et c'est tout l'intérêt du composant : il doit rester
 * un hub de maillage interne dense pour Google, tout en restant lisible sur
 * un écran de 360 px.
 *
 * La réponse :
 *  - **Libellé court visible, ancrage complet en `sr-only`.** À l'écran on
 *    lit « Cayenne » ; dans le DOM, Google lit « Voir les bons plans à
 *    Cayenne ». Aucune perte SEO (motif validé, cf. CODEX.md).
 *  - **Onglets sur mobile uniquement.** Les trois piliers empilés faisaient
 *    défiler l'équivalent de deux écrans. On n'en montre qu'un à la fois en
 *    dessous de `lg`, et les trois côte à côte au-dessus.
 *  - **Les colonnes inactives sont masquées en CSS, jamais démontées** :
 *    tous les liens restent dans le HTML servi, donc crawlables. Un
 *    rendu conditionnel les aurait fait disparaître du DOM et aurait
 *    saboté le maillage.
 */

type PillarChip = {
  href: string;
  label: string;
  /** Préfixe invisible qui reconstitue l'ancrage descriptif. */
  srPrefix: string;
  title: string;
};

type Pillar = {
  key: string;
  tab: string;
  title: string;
  hubHref: string;
  hubSrSuffix: string;
  cityChips: PillarChip[];
  categoryChips: PillarChip[];
};

const PILLARS: Pillar[] = [
  {
    key: "deals",
    tab: "Bons plans",
    title: "Bons plans",
    hubHref: "/bons-plans/guyane",
    hubSrSuffix: "les bons plans en Guyane",
    cityChips: CORE_CITIES.map((city) => ({
      href: getDealsCityPath(city.slug),
      label: city.name,
      srPrefix: "Voir les bons plans à ",
      title: `Bons plans à ${city.name}`,
    })),
    categoryChips: DEAL_CATEGORY_PILLARS.map((category) => ({
      href: getDealsCategoryPath(category.slug),
      label: category.name,
      srPrefix: "Voir les bons plans ",
      title: `Bons plans ${category.name.toLowerCase()} en Guyane`,
    })),
  },
  {
    key: "listings",
    tab: "Annonces",
    title: "Petites annonces",
    hubHref: "/annonces/guyane",
    hubSrSuffix: "les annonces en Guyane",
    cityChips: CORE_CITIES.map((city) => ({
      href: getListingsCityPath(city.slug),
      label: city.name,
      srPrefix: "Voir les annonces à ",
      title: `Annonces à ${city.name}`,
    })),
    categoryChips: LISTING_CATEGORY_PILLARS.map((category) => ({
      href: getListingsCategoryPath(category.slug),
      label: category.name,
      srPrefix: "Voir les annonces ",
      title: `Annonces ${category.name.toLowerCase()} en Guyane`,
    })),
  },
  {
    key: "activities",
    tab: "Activités",
    title: "Activités",
    hubHref: "/activites/guyane",
    hubSrSuffix: "les activités en Guyane",
    cityChips: ACTIVITY_CITY_PILLARS.map((city) => ({
      href: getActivitiesCityPath(city.slug),
      label: city.name,
      srPrefix: "Voir les activités à ",
      title: `Activités à ${city.name}`,
    })),
    categoryChips: ACTIVITY_CATEGORY_PILLARS.map((category) => ({
      href: getActivitiesCategoryPath(category.slug),
      label: category.name,
      srPrefix: "Voir les activités ",
      title: `Activités ${category.name.toLowerCase()} en Guyane`,
    })),
  },
];

function Chip({ chip }: { chip: PillarChip }) {
  return (
    <Link
      href={chip.href}
      title={chip.title}
      className="inline-flex min-h-11 items-center rounded-full border border-border bg-background px-4 text-sm font-medium text-ink-800 transition duration-base hover:border-peyi-orange-300 hover:bg-peyi-orange-50 hover:text-peyi-orange-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      <span className="sr-only">{chip.srPrefix}</span>
      <span aria-hidden>{chip.label}</span>
    </Link>
  );
}

function ChipGroup({
  icon: Icon,
  label,
  chips,
}: {
  icon: typeof MapPin;
  label: string;
  chips: PillarChip[];
}) {
  return (
    <div>
      <p className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
        <Icon className="h-3 w-3" aria-hidden />
        {label}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {chips.map((chip) => (
          <Chip key={chip.href} chip={chip} />
        ))}
      </div>
    </div>
  );
}

export function HomePillarLinks() {
  const [active, setActive] = useState(PILLARS[0].key);

  return (
    <section className="mt-8 px-4 sm:px-0" aria-labelledby="home-seo-explore">
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2
          id="home-seo-explore"
          className="font-display text-lg font-semibold text-ink-900"
        >
          Explorer la Guyane
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Bons plans, annonces et activités, par commune ou par thématique.
        </p>

        {/* Onglets — mobile et tablette uniquement. */}
        <div
          role="tablist"
          aria-label="Type de contenu"
          className="mt-4 grid grid-cols-3 gap-1 rounded-full border border-border bg-muted p-1 text-sm font-medium lg:hidden"
        >
          {PILLARS.map((pillar) => (
            <button
              key={pillar.key}
              type="button"
              role="tab"
              aria-selected={active === pillar.key}
              onClick={() => setActive(pillar.key)}
              className={cn(
                "min-h-11 rounded-full px-2 text-center transition duration-base",
                active === pillar.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground",
              )}
            >
              {pillar.tab}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-5 lg:grid-cols-3 lg:gap-6">
          {PILLARS.map((pillar) => (
            <div
              key={pillar.key}
              // Masqué en CSS et non démonté : les liens des onglets
              // inactifs restent dans le HTML pour le maillage interne.
              className={cn(
                "flex-col gap-3",
                active === pillar.key ? "flex" : "hidden lg:flex",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                {/* Le titre fait doublon avec l'onglet actif sur mobile. */}
                <h3 className="hidden text-sm font-semibold text-foreground lg:block">
                  {pillar.title}
                </h3>
                <Link
                  href={pillar.hubHref}
                  className="ml-auto inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-peyi-orange-700 hover:text-peyi-orange-800"
                >
                  <span aria-hidden>Tout voir</span>
                  <span className="sr-only">Voir {pillar.hubSrSuffix}</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </div>

              <ChipGroup icon={MapPin} label="Par ville" chips={pillar.cityChips} />
              <ChipGroup
                icon={Tag}
                label="Par catégorie"
                chips={pillar.categoryChips}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
