import Link from "next/link";
import { Map } from "lucide-react";

import { ActivityCard } from "@/components/activities/ActivityCard";
import { SeoFaq, SeoIntro } from "@/components/seo/SeoBlocks";
import { withTimeout } from "@/lib/async/with-timeout";
import { buildActivityFeatureCollection } from "@/lib/activities/geojson";
import { fetchActivitiesForPillar } from "@/lib/seo/pillar-queries";
import type { FaqItem } from "@/lib/seo/local-pages";
import {
  buildBreadcrumbJsonLd,
  buildCollectionPageJsonLd,
  buildFaqJsonLd,
  serializeJsonLd,
} from "@/lib/seo/json-ld";

const PILLAR_DATA_TIMEOUT_MS = 4_500;

/**
 * Page pilier SEO Activités — strictement calquée sur DealsPillarPage /
 * ListingsPillarPage : intro éditoriale, liste server-rendered, liens
 * d'exploration croisés, FAQ, JSON-LD CollectionPage + Breadcrumb + FAQ.
 * S'y ajoute le lien vers la carte interactive filtrée (`mapHref`), le
 * cœur du maillage interne de la verticale.
 */

type Props = {
  canonicalPath: string;
  h1: string;
  intro: string;
  eyebrow?: string;
  filters: {
    citySlug?: string | null;
    categorySlug?: string | null;
  };
  /** Carte interactive pré-filtrée correspondant à cette page. */
  mapHref: string;
  breadcrumb: Array<{ name: string; url: string }>;
  faq: FaqItem[];
};

export async function ActivitiesPillarPage({
  canonicalPath,
  h1,
  intro,
  eyebrow,
  filters,
  mapHref,
  breadcrumb,
  faq,
}: Props) {
  // Même politique anti-crash que les autres piliers : un hiccup Prisma
  // laisse la page utile (intro, FAQ, maillage) avec un bandeau d'info.
  let activities: Awaited<
    ReturnType<typeof fetchActivitiesForPillar>
  >["activities"] = [];
  let total = 0;
  let loadFailed = false;
  try {
    const payload = await withTimeout(
      fetchActivitiesForPillar(filters),
      PILLAR_DATA_TIMEOUT_MS,
      "activites/pillar-list",
    );
    activities = payload.activities;
    total = payload.total;
  } catch (err) {
    loadFailed = true;
    // eslint-disable-next-line no-console
    console.error("[activites/pillar] fetch failed", { filters, err });
  }

  const features = buildActivityFeatureCollection(activities).features;

  const jsonLdChunks = [
    buildCollectionPageJsonLd({
      name: h1,
      description: intro,
      path: canonicalPath,
    }),
    buildBreadcrumbJsonLd(breadcrumb),
  ];

  const faqJsonLd = buildFaqJsonLd(faq);
  if (faqJsonLd) {
    jsonLdChunks.push(faqJsonLd);
  }

  return (
    <main className="mx-auto max-w-2xl px-4 pb-14 pt-6 animate-in fade-in duration-300 sm:pt-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLdChunks) }}
      />

      <SeoIntro h1={h1} intro={intro} eyebrow={eyebrow} />

      <section className="mt-5 rounded-xl border border-border bg-card p-4 sm:p-5">
        {loadFailed && (
          <div
            role="status"
            className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 sm:text-sm"
          >
            La liste des activités est temporairement indisponible. Réessaie
            dans quelques secondes.
          </div>
        )}
        <p className="text-sm text-muted-foreground">
          {total > 0
            ? `${total.toLocaleString("fr-FR")} activité${total > 1 ? "s" : ""} référencée${total > 1 ? "s" : ""}.`
            : "Aucune activité référencée pour ce périmètre pour le moment."}
        </p>

        {features.length === 0 ? (
          <div className="mt-3 rounded-lg border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
            Cette page se remplit au fil des contributions. Explore les pages
            voisines ou la carte pour élargir la recherche.
          </div>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {features.map((feature) => (
              <li key={feature.properties.id}>
                <ActivityCard
                  feature={feature}
                  href={`/activites/${feature.properties.slug}`}
                />
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4">
          <Link
            href={mapHref}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:border-peyi-orange-300 hover:text-peyi-orange-700"
          >
            <Map className="h-4 w-4" aria-hidden />
            Voir sur la carte interactive
          </Link>
        </div>
      </section>

      <div className="mt-5">
        <SeoFaq items={faq} />
      </div>
    </main>
  );
}
