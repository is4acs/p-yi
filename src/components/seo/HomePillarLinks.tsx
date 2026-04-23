import Link from "next/link";

import {
  CORE_CITIES,
  DEAL_CATEGORY_PILLARS,
  LISTING_CATEGORY_PILLARS,
  getDealsCategoryPath,
  getDealsCityPath,
  getListingsCategoryPath,
  getListingsCityPath,
} from "@/lib/seo/local-pages";

export function HomePillarLinks() {
  return (
    <section className="mt-8 px-4 sm:px-0" aria-labelledby="home-seo-explore">
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 id="home-seo-explore" className="font-display text-lg font-semibold text-ink-900">
          Explorer la Guyane par ville et catégorie
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Accès direct aux pages piliers locales pour trouver plus vite les bons plans et annonces pertinentes.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Bons plans</h3>
            <ul className="mt-2 space-y-1.5 text-sm">
              <li>
                <Link href="/bons-plans/guyane" className="text-peyi-orange-700 hover:underline">
                  Voir les bons plans en Guyane
                </Link>
              </li>
              {CORE_CITIES.map((city) => (
                <li key={`deal-city-${city.slug}`}>
                  <Link href={getDealsCityPath(city.slug)} className="text-peyi-orange-700 hover:underline">
                    Voir les bons plans à {city.name}
                  </Link>
                </li>
              ))}
              {DEAL_CATEGORY_PILLARS.slice(0, 2).map((category) => (
                <li key={`deal-cat-${category.slug}`}>
                  <Link
                    href={getDealsCategoryPath(category.slug)}
                    className="text-peyi-orange-700 hover:underline"
                  >
                    Voir les bons plans {category.name.toLowerCase()} en Guyane
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground">Petites annonces</h3>
            <ul className="mt-2 space-y-1.5 text-sm">
              <li>
                <Link href="/annonces/guyane" className="text-peyi-orange-700 hover:underline">
                  Voir les annonces en Guyane
                </Link>
              </li>
              {CORE_CITIES.map((city) => (
                <li key={`listing-city-${city.slug}`}>
                  <Link
                    href={getListingsCityPath(city.slug)}
                    className="text-peyi-orange-700 hover:underline"
                  >
                    Voir les annonces à {city.name}
                  </Link>
                </li>
              ))}
              {LISTING_CATEGORY_PILLARS.slice(0, 3).map((category) => (
                <li key={`listing-cat-${category.slug}`}>
                  <Link
                    href={getListingsCategoryPath(category.slug)}
                    className="text-peyi-orange-700 hover:underline"
                  >
                    Voir les annonces {category.name.toLowerCase()} en Guyane
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
