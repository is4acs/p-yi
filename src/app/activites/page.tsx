import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";

import { ActivitiesExplorer } from "@/components/activities/ActivitiesExplorer";
import { ActivityMapSkeleton } from "@/components/activities/ActivityMapSkeleton";
import { getPublishedActivityLinks } from "@/lib/activities/queries";
import { withTimeout } from "@/lib/async/with-timeout";
import { buildSeoMetadata } from "@/lib/seo/metadata";

/**
 * /activites — carte interactive des activités et lieux à découvrir.
 * Shell en Server Component (metadata, landmark, <noscript> listant les
 * activités en HTML pour les crawlers sans JS) ; la carte elle-même est
 * un Client Component chargé dynamiquement. ISR 300 s pour rafraîchir
 * la liste noscript sans requête à chaque hit.
 */

export const revalidate = 300;

const NOSCRIPT_TIMEOUT_MS = 3_000;

export const metadata: Metadata = buildSeoMetadata({
  title: "Carte des activités et lieux à découvrir en Guyane",
  description:
    "Explore la Guyane sur carte : sentiers, cascades, îles, marais, sites du bagne, villages et sorties en pirogue — avec le mode d'accès et la meilleure saison pour chaque lieu.",
  canonical: "/activites",
});

export default async function ActivitesPage() {
  // Liste de secours pour les crawlers / navigateurs sans JS. Une panne
  // DB ne bloque pas la page : la carte côté client a son propre fetch.
  let links: Awaited<ReturnType<typeof getPublishedActivityLinks>> = [];
  try {
    links = await withTimeout(
      getPublishedActivityLinks(),
      NOSCRIPT_TIMEOUT_MS,
      "activites/noscript-links",
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[activites] noscript links failed", err);
  }

  return (
    // Mobile : le Header global est masqué sur /activites (ChromeVisibility),
    // il ne reste que la MobileNav (5rem, pb-20 du body). Desktop : header 4rem.
    <main className="h-[calc(100dvh-5rem)] bg-soleil-cream text-soleil-forest dark:bg-soleil-night dark:text-soleil-cream lg:h-[calc(100dvh-4rem)]">
      <h1 className="sr-only">
        Activités et lieux à découvrir en Guyane — carte interactive
      </h1>

      <noscript>
        <section className="mx-auto max-w-2xl px-4 py-6">
          <h2 className="font-display text-title-sm font-bold">
            Activités et lieux à découvrir en Guyane
          </h2>
          <p className="mt-2 text-sm">
            La carte interactive nécessite JavaScript. Voici la liste des
            activités référencées :
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
            {links.map((activity) => (
              <li key={activity.slug}>
                <Link
                  href={`/activites/${activity.slug}`}
                  className="underline"
                >
                  {activity.name} — {activity.city.name}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm">
            <Link href="/activites/guyane" className="underline">
              Voir toutes les activités en Guyane
            </Link>
          </p>
        </section>
      </noscript>

      {/* Suspense requis : l'Explorer lit useSearchParams (filtres URL)
          alors que le shell de la page est rendu statiquement. */}
      <Suspense fallback={<ActivityMapSkeleton />}>
        <ActivitiesExplorer />
      </Suspense>
    </main>
  );
}
