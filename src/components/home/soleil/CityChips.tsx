import Link from "next/link";

import { ScrollRail } from "@/components/shared/ScrollRail";
import { getDealsCityPath } from "@/lib/seo/local-pages";
import { cn } from "@/lib/utils";

/**
 * Rail des communes du héros. Ce sont des raccourcis vers les pages
 * piliers locales (`/bons-plans/cayenne`…), pas un filtre : elles
 * mènent à des pages indexables, ce qui en fait aussi un maillage
 * interne utile.
 *
 * Les communes listées sont celles qui ont une page pilier ; inutile
 * d'envoyer quelqu'un vers une commune sans contenu.
 */

const CITIES = [
  { slug: null, label: "Toute la Guyane" },
  { slug: "cayenne", label: "Cayenne" },
  { slug: "kourou", label: "Kourou" },
  { slug: "matoury", label: "Matoury" },
  { slug: "remire-montjoly", label: "Rémire-Montjoly" },
  { slug: "saint-laurent-du-maroni", label: "St-Laurent" },
];

export function CityChips() {
  return (
    <ScrollRail
      railClassName="-mx-5 px-5 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0"
      fadeClassName="lg:hidden"
    >
      {CITIES.map((city) => {
        const isAll = city.slug === null;
        return (
          <Link
            key={city.label}
            href={isAll ? "/bons-plans" : getDealsCityPath(city.slug!)}
            className={cn(
              "flex-none rounded-full px-3.5 py-[7px] text-xs transition",
              isAll
                ? "bg-foreground font-bold text-background"
                : "border-[1.5px] border-input font-semibold hover:border-peyi-orange-400",
            )}
          >
            {city.label}
          </Link>
        );
      })}
    </ScrollRail>
  );
}
