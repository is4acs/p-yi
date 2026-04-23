import Link from "next/link";
import { Flame, MapPin, Tag } from "lucide-react";
import type { ReactNode } from "react";

import {
  CORE_CITIES,
  DEAL_CATEGORY_PILLARS,
  LISTING_CATEGORY_PILLARS,
  getDealsCategoryPath,
  getDealsCityPath,
  getListingsCategoryPath,
  getListingsCityPath,
} from "@/lib/seo/local-pages";

type SeoLink = {
  href: string;
  label: string;
};

function SeoLinkGrid({ links }: { links: SeoLink[] }) {
  return (
    <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
      {links.map((link) => (
        <li key={link.href}>
          <Link
            href={link.href}
            className="inline-flex w-full items-center rounded-md border border-peyi-orange-200/80 bg-peyi-orange-50/70 px-2.5 py-2 text-sm font-medium text-peyi-orange-800 transition hover:border-peyi-orange-300 hover:bg-peyi-orange-100/80"
          >
            <span className="truncate">{link.label}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function PillarColumn({
  title,
  icon,
  cityLinks,
  categoryLinks,
}: {
  title: string;
  icon: ReactNode;
  cityLinks: SeoLink[];
  categoryLinks: SeoLink[];
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
      <h3 className="flex items-center gap-2 font-display text-base font-semibold text-ink-900">
        {icon}
        {title}
      </h3>

      <div className="mt-3">
        <h4 className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" aria-hidden />
          Villes
        </h4>
        <SeoLinkGrid links={cityLinks} />
      </div>

      <div className="mt-4">
        <h4 className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Catégories
        </h4>
        <SeoLinkGrid links={categoryLinks} />
      </div>
    </div>
  );
}

export function HomePillarLinks() {
  const dealsCityLinks: SeoLink[] = [
    { href: "/bons-plans/guyane", label: "Bons plans Guyane" },
    ...CORE_CITIES.map((city) => ({
      href: getDealsCityPath(city.slug),
      label: `Bons plans ${city.name}`,
    })),
  ];

  const dealsCategoryLinks: SeoLink[] = DEAL_CATEGORY_PILLARS.map((category) => ({
    href: getDealsCategoryPath(category.slug),
    label: `Promos ${category.name} Guyane`,
  }));

  const listingsCityLinks: SeoLink[] = [
    { href: "/annonces/guyane", label: "Annonces Guyane" },
    ...CORE_CITIES.map((city) => ({
      href: getListingsCityPath(city.slug),
      label: `Annonces ${city.name}`,
    })),
  ];

  const listingsCategoryLinks: SeoLink[] = LISTING_CATEGORY_PILLARS.map(
    (category) => ({
      href: getListingsCategoryPath(category.slug),
      label: `Annonces ${category.name} Guyane`,
    }),
  );

  return (
    <section className="mt-8 px-4 sm:px-0" aria-labelledby="home-seo-explore">
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2
          id="home-seo-explore"
          className="font-display text-lg font-semibold text-ink-900"
        >
          Explorer la Guyane par ville et catégorie
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Liens directs vers nos pages piliers locales pour trouver rapidement
          des offres pertinentes en Guyane.
        </p>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <PillarColumn
            title="Bons plans"
            icon={<Flame className="h-4 w-4 text-hot" aria-hidden />}
            cityLinks={dealsCityLinks}
            categoryLinks={dealsCategoryLinks}
          />
          <PillarColumn
            title="Petites annonces"
            icon={<Tag className="h-4 w-4 text-peyi-green-700" aria-hidden />}
            cityLinks={listingsCityLinks}
            categoryLinks={listingsCategoryLinks}
          />
        </div>
      </div>
    </section>
  );
}
