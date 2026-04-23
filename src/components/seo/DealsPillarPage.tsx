import Link from "next/link";

import { DealCard } from "@/components/deals/DealCard";
import { ExplorerAlso, SeoFaq, SeoIntro } from "@/components/seo/SeoBlocks";
import { fetchDealsForPillar } from "@/lib/seo/pillar-queries";
import type { ExploreLink, FaqItem } from "@/lib/seo/local-pages";
import {
  buildBreadcrumbJsonLd,
  buildCollectionPageJsonLd,
  buildFaqJsonLd,
  serializeJsonLd,
} from "@/lib/seo/json-ld";

type Props = {
  canonicalPath: string;
  h1: string;
  intro: string;
  eyebrow?: string;
  filters: {
    citySlug?: string | null;
    categorySlug?: string | null;
    storeSlug?: string | null;
  };
  breadcrumb: Array<{ name: string; url: string }>;
  faq: FaqItem[];
  exploreLinks: ExploreLink[];
};

export async function DealsPillarPage({
  canonicalPath,
  h1,
  intro,
  eyebrow,
  filters,
  breadcrumb,
  faq,
  exploreLinks,
}: Props) {
  const { deals, total } = await fetchDealsForPillar(filters);

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
        <p className="text-sm text-muted-foreground">
          {total > 0
            ? `${total.toLocaleString("fr-FR")} bon plan${total > 1 ? "s" : ""} actif${total > 1 ? "s" : ""} trouvé${total > 1 ? "s" : ""}.`
            : "Aucun bon plan actif pour ce périmètre pour le moment."}
        </p>

        {deals.length === 0 ? (
          <div className="mt-3 rounded-lg border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
            Le flux est encore léger ici. Explore les pages voisines pour élargir la recherche.
          </div>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {deals.map((deal) => (
              <li key={deal.id}>
                <DealCard deal={deal} variant="full" />
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4">
          <Link
            href="/bons-plans"
            className="inline-flex items-center rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:border-peyi-orange-300 hover:text-peyi-orange-700"
          >
            Ouvrir le flux complet des bons plans
          </Link>
        </div>
      </section>

      <div className="mt-5 space-y-5">
        <ExplorerAlso links={exploreLinks} />
        <SeoFaq items={faq} />
      </div>
    </main>
  );
}
