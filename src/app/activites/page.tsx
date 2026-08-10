import type { Metadata } from "next";

import { ActivitiesExplorer } from "@/components/activities/ActivitiesExplorer";
import { buildSeoMetadata } from "@/lib/seo/metadata";

/**
 * /activites — carte interactive des activités et lieux à découvrir.
 * Shell en Server Component (metadata, landmark, futur <noscript> SEO) ;
 * la carte elle-même est un Client Component chargé dynamiquement.
 */

export const metadata: Metadata = buildSeoMetadata({
  title: "Carte des activités et lieux à découvrir en Guyane",
  description:
    "Explore la Guyane sur carte : sentiers, cascades, îles, marais, sites du bagne, villages et sorties en pirogue — avec le mode d'accès et la meilleure saison pour chaque lieu.",
  canonical: "/activites",
});

export default function ActivitesPage() {
  return (
    <main className="h-[calc(100dvh-8.5rem)] sm:h-[calc(100dvh-4rem)]">
      <h1 className="sr-only">
        Activités et lieux à découvrir en Guyane — carte interactive
      </h1>
      <ActivitiesExplorer />
    </main>
  );
}
