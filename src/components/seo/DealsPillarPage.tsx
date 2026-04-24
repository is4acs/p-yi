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
  // Un hiccup Prisma (ex. pool saturé pendant un pic de trafic) ne
  // doit pas écrouler toute la page pilier — le gros du contenu est
  // statique (H1, intro, FAQ, liens connexes) et reste utile même
  // sans la liste des deals. On retombe sur un état vide avec un
  // bandeau d'info plutôt que sur le boundary global.
  let deals: Awaited<ReturnType<typeof fetchDealsForPillar>>["deals"] = [];
  let total = 0;
  let loadFailed = false;
  try {
    const payload = await fetchDealsForPillar(filters);
    deals = payload.deals;
    total = payload.total;
  } catch (err) {
    loadFailed = true;
    // eslint-disable-next-line no-console
    console.error("[deals/pillar] fetch failed", { filters, err });
  }

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
            Le flux des bons plans est temporairement indisponible. Réessaie
            dans quelques secondes.
          </div>
        )}
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
