import Link from "next/link";

import { buildListingsUrl } from "@/lib/listings/url";

/**
 * PopularSearchChips — rangée horizontale de recherches pré-configurées
 * pour `/annonces` (mockup `Pages Peyi.html` · 18 avril 2026).
 *
 * Rôle : transformer un clic en recherche utile. Plutôt que laisser
 * l'utilisateur deviner ce qu'il peut chercher, on expose 5 requêtes
 * fréquentes du marché guyanais — Cayenne/Kourou, immobilier, voitures
 * accessibles, tech d'occasion, emploi. Ces combinaisons (category +
 * city + q + filters) sont la valeur "longue traîne" du service : on
 * les rend atteignables en un tap.
 *
 * Tous les slugs référencent les catégories seedées (`prisma/seed.ts`) :
 *   • `immobilier`       — 🏠
 *   • `vehicules`        — 🚗
 *   • `multimedia-tech`  — 📱
 *   • `emploi-services`  — 💼
 *
 * Si un slug est renommé côté DB, le lien retombe sur `/annonces?category=<slug>`
 * qui affiche un état vide (pas d'erreur). On accepte ce risque : les
 * chips sont un raccourci, pas un endpoint critique.
 *
 * Ne s'affiche qu'en mode "découverte" (aucun filtre actif) — sous
 * filtre on laisse la page se concentrer sur les résultats (cf.
 * `<AnnoncesHero>` et `<DealCategoryStrip>`).
 *
 * Layout : scroll-snap horizontal mobile (économie vertical), wrap flex
 * desktop (tout visible d'un coup). Pattern identique à `<DealCategoryStrip>`
 * pour la cohérence entre les deux pages.
 */

const POPULAR_SEARCHES: Array<{
  emoji: string;
  label: string;
  params: Parameters<typeof buildListingsUrl>[0];
}> = [
  {
    emoji: "🏠",
    label: "Appartements Cayenne",
    params: { category: "immobilier", city: "cayenne" },
  },
  {
    emoji: "🚗",
    label: "Voitures < 5 000 €",
    params: { category: "vehicules", filters: { priceMax: 5000 } },
  },
  {
    emoji: "📱",
    label: "iPhone d'occasion",
    params: { category: "multimedia-tech", q: "iPhone" },
  },
  {
    emoji: "💼",
    label: "Jobs Kourou",
    params: { category: "emploi-services", city: "kourou" },
  },
  {
    emoji: "🏖️",
    label: "Locations saisonnières",
    params: { category: "immobilier", q: "saisonnière" },
  },
];

export function PopularSearchChips() {
  return (
    <section
      aria-label="Recherches populaires"
      className="border-b border-ink-100 bg-background px-4 py-4 sm:px-0 sm:py-5"
    >
      <div className="scrollbar-hide flex snap-x snap-mandatory items-center gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:snap-none sm:gap-2.5 sm:overflow-visible sm:pb-0">
        <span className="shrink-0 snap-start pr-1 font-display text-sm font-bold text-ink-700">
          Populaires :
        </span>
        {POPULAR_SEARCHES.map((p) => (
          <Link
            key={p.label}
            href={buildListingsUrl(p.params)}
            className="inline-flex shrink-0 snap-start items-center gap-1.5 rounded-full border border-ink-100 bg-background px-3 py-1.5 font-display text-[13px] font-semibold text-ink-700 transition-[transform,border-color,color] duration-base hover:-translate-y-0.5 hover:border-peyi-orange-300 hover:text-peyi-orange-700"
          >
            <span aria-hidden>{p.emoji}</span>
            <span>{p.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
