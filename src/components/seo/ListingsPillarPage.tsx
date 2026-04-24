import Link from "next/link";

import { ListingCardTile } from "@/components/listings/ListingCardTile";
import { ExplorerAlso, SeoFaq, SeoIntro } from "@/components/seo/SeoBlocks";
import type { ExploreLink, FaqItem } from "@/lib/seo/local-pages";
import {
  buildBreadcrumbJsonLd,
  buildCollectionPageJsonLd,
  buildFaqJsonLd,
  serializeJsonLd,
} from "@/lib/seo/json-ld";
import { fetchListingsForPillar } from "@/lib/seo/pillar-queries";

type Props = {
  canonicalPath: string;
  h1: string;
  intro: string;
  eyebrow?: string;
  filters: {
    citySlug?: string | null;
    categorySlug?: string | null;
  };
  breadcrumb: Array<{ name: string; url: string }>;
  faq: FaqItem[];
  exploreLinks: ExploreLink[];
};

export async function ListingsPillarPage({
  canonicalPath,
  h1,
  intro,
  eyebrow,
  filters,
  breadcrumb,
  faq,
  exploreLinks,
}: Props) {
  // Cf. `DealsPillarPage` : on isole le fetch pour qu'un crash Prisma
  // n'efface pas l'intégralité du contenu SEO statique de la page.
  let listings: Awaited<ReturnType<typeof fetchListingsForPillar>>["listings"] =
    [];
  let total = 0;
  let loadFailed = false;
  try {
    const payload = await fetchListingsForPillar(filters);
    listings = payload.listings;
    total = payload.total;
  } catch (err) {
    loadFailed = true;
    // eslint-disable-next-line no-console
    console.error("[listings/pillar] fetch failed", { filters, err });
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
    <main className="mx-auto max-w-6xl px-4 pb-14 pt-6 animate-in fade-in duration-300 sm:pt-10">
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
            Le flux des annonces est temporairement indisponible. Réessaie
            dans quelques secondes.
          </div>
        )}
        <p className="text-sm text-muted-foreground">
          {total > 0
            ? `${total.toLocaleString("fr-FR")} annonce${total > 1 ? "s" : ""} active${total > 1 ? "s" : ""}.`
            : "Aucune annonce active pour ce périmètre pour le moment."}
        </p>

        {listings.length === 0 ? (
          <div className="mt-3 rounded-lg border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
            Le catalogue est encore en construction sur cette zone. Tu peux élargir avec les pages connexes ci-dessous.
          </div>
        ) : (
          <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {listings.map((listing) => (
              <li key={listing.id}>
                <ListingCardTile listing={listing} />
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4">
          <Link
            href="/annonces"
            className="inline-flex items-center rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:border-peyi-orange-300 hover:text-peyi-orange-700"
          >
            Ouvrir le flux complet des annonces
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
