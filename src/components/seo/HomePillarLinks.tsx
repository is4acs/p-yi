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

type PillarChip = {
  href: string;
  label: string;
  // Préfixe invisible pour garder un anchor text descriptif côté SEO.
  srPrefix: string;
  // Attribut `title` pour la tooltip UX.
  title: string;
};

function buildDealChips(): {
  cityChips: PillarChip[];
  categoryChips: PillarChip[];
} {
  const cityChips = CORE_CITIES.map((city) => ({
    href: getDealsCityPath(city.slug),
    label: city.name,
    srPrefix: "Voir les bons plans à ",
    title: `Bons plans à ${city.name}`,
  }));
  const categoryChips = DEAL_CATEGORY_PILLARS.map((category) => ({
    href: getDealsCategoryPath(category.slug),
    label: category.name,
    srPrefix: "Voir les bons plans ",
    title: `Bons plans ${category.name.toLowerCase()} en Guyane`,
  }));
  return { cityChips, categoryChips };
}

function buildListingChips(): {
  cityChips: PillarChip[];
  categoryChips: PillarChip[];
} {
  const cityChips = CORE_CITIES.map((city) => ({
    href: getListingsCityPath(city.slug),
    label: city.name,
    srPrefix: "Voir les annonces à ",
    title: `Annonces à ${city.name}`,
  }));
  const categoryChips = LISTING_CATEGORY_PILLARS.map((category) => ({
    href: getListingsCategoryPath(category.slug),
    label: category.name,
    srPrefix: "Voir les annonces ",
    title: `Annonces ${category.name.toLowerCase()} en Guyane`,
  }));
  return { cityChips, categoryChips };
}

function buildActivityChips(): {
  cityChips: PillarChip[];
  categoryChips: PillarChip[];
} {
  const cityChips = ACTIVITY_CITY_PILLARS.map((city) => ({
    href: getActivitiesCityPath(city.slug),
    label: city.name,
    srPrefix: "Voir les activités à ",
    title: `Activités à ${city.name}`,
  }));
  const categoryChips = ACTIVITY_CATEGORY_PILLARS.map((category) => ({
    href: getActivitiesCategoryPath(category.slug),
    label: category.name,
    srPrefix: "Voir les activités ",
    title: `Activités ${category.name.toLowerCase()} en Guyane`,
  }));
  return { cityChips, categoryChips };
}

function Chip({ chip }: { chip: PillarChip }) {
  return (
    <Link
      href={chip.href}
      title={chip.title}
      className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-ink-800 transition hover:border-peyi-orange-300 hover:bg-peyi-orange-50 hover:text-peyi-orange-700"
    >
      <span className="sr-only">{chip.srPrefix}</span>
      {chip.label}
    </Link>
  );
}

function PillarColumn({
  title,
  hubHref,
  hubLabel,
  hubSrSuffix,
  cityChips,
  categoryChips,
}: {
  title: string;
  hubHref: string;
  hubLabel: string;
  hubSrSuffix: string;
  cityChips: PillarChip[];
  categoryChips: PillarChip[];
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <Link
          href={hubHref}
          className="inline-flex items-center gap-1 text-xs font-semibold text-peyi-orange-700 hover:text-peyi-orange-800"
        >
          <span aria-hidden>{hubLabel}</span>
          <span className="sr-only">{hubSrSuffix}</span>
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>

      <div>
        <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          <MapPin className="h-3 w-3" aria-hidden />
          Par ville
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {cityChips.map((chip) => (
            <Chip key={chip.href} chip={chip} />
          ))}
        </div>
      </div>

      <div>
        <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          <Tag className="h-3 w-3" aria-hidden />
          Par catégorie
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {categoryChips.map((chip) => (
            <Chip key={chip.href} chip={chip} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function HomePillarLinks() {
  const deals = buildDealChips();
  const listings = buildListingChips();
  const activities = buildActivityChips();

  return (
    <section className="mt-8 px-4 sm:px-0" aria-labelledby="home-seo-explore">
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2
          id="home-seo-explore"
          className="font-display text-lg font-semibold text-ink-900"
        >
          Explorer la Guyane par ville et catégorie
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Accès rapide aux pages locales pour trouver bons plans, annonces et
          activités par commune ou thématique.
        </p>

        <div className="mt-4 grid gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          <PillarColumn
            title="Bons plans"
            hubHref="/bons-plans/guyane"
            hubLabel="Tout voir"
            hubSrSuffix="les bons plans en Guyane"
            cityChips={deals.cityChips}
            categoryChips={deals.categoryChips}
          />
          <PillarColumn
            title="Petites annonces"
            hubHref="/annonces/guyane"
            hubLabel="Tout voir"
            hubSrSuffix="les annonces en Guyane"
            cityChips={listings.cityChips}
            categoryChips={listings.categoryChips}
          />
          <PillarColumn
            title="Activités"
            hubHref="/activites/guyane"
            hubLabel="Tout voir"
            hubSrSuffix="les activités en Guyane"
            cityChips={activities.cityChips}
            categoryChips={activities.categoryChips}
          />
        </div>
      </div>
    </section>
  );
}
