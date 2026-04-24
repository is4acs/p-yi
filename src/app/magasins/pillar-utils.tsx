import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DealCard } from "@/components/deals/DealCard";
import { ExplorerAlso, SeoFaq, SeoIntro } from "@/components/seo/SeoBlocks";
import { buildSeoMetadata } from "@/lib/seo/metadata";
import {
  buildStoreFaq,
  buildStoreIntro,
  buildStoreExploreLinks,
} from "@/lib/seo/pillar-content";
import {
  MIN_INDEXABLE_STORE_DEALS,
  STORE_PILLARS,
  getStoreBySlug,
  getStorePath,
} from "@/lib/seo/local-pages";
import {
  buildBreadcrumbJsonLd,
  buildCollectionPageJsonLd,
  buildFaqJsonLd,
  serializeJsonLd,
} from "@/lib/seo/json-ld";
import {
  fetchDealsForPillar,
  fetchStoreWithDealCount,
} from "@/lib/seo/pillar-queries";

export function getStoreStaticParams() {
  return STORE_PILLARS.map((store) => ({ slug: store.slug }));
}

export async function buildStoreMetadata(storeSlug: string): Promise<Metadata> {
  const configuredStore = getStoreBySlug(storeSlug);
  if (!configuredStore) notFound();

  // Si Prisma hoquette pendant la phase metadata (DB indisponible,
  // pool saturé au build…), on retombe sur une metadata noindex basée
  // sur le store seedé. Sans ce filet, le crash remonterait au boundary
  // global et afficherait l'écran d'erreur pour tous les visiteurs.
  const store = await fetchStoreWithDealCount(storeSlug).catch((err) => {
    // eslint-disable-next-line no-console
    console.error("[magasins/metadata] fetch failed", {
      slug: storeSlug,
      err,
    });
    return null;
  });
  if (!store) {
    return buildSeoMetadata({
      title: `Promos ${configuredStore.name}`,
      description: `Les promos locales ${configuredStore.name} en Guyane.`,
      canonical: getStorePath(configuredStore.slug),
      index: false,
    });
  }

  return buildSeoMetadata({
    title: `Promo ${store.name}`,
    description: `Retrouve les promos ${store.name} en Guyane, avec les bons plans actifs et les offres locales les plus utiles.`,
    canonical: getStorePath(store.slug),
    index: store._count.deals >= MIN_INDEXABLE_STORE_DEALS,
  });
}

export async function renderStorePage(storeSlug: string) {
  const configuredStore = getStoreBySlug(storeSlug);
  if (!configuredStore) notFound();

  // Cf. `DealsPillarPage` / `ListingsPillarPage` : on isole les fetchs
  // pour que la page pilier magasin reste affichable même si une seule
  // requête Prisma plante. `allSettled` permet d'afficher la fiche
  // store sans deals (ou vice-versa) plutôt que l'écran d'erreur.
  const [storeResult, dealsResult] = await Promise.allSettled([
    fetchStoreWithDealCount(storeSlug),
    fetchDealsForPillar({ storeSlug }),
  ]);

  const store =
    storeResult.status === "fulfilled" ? storeResult.value : null;
  const dealsPayload =
    dealsResult.status === "fulfilled"
      ? dealsResult.value
      : { deals: [], total: 0 };
  const deals = dealsPayload.deals;
  const total = dealsPayload.total;
  const loadFailed =
    storeResult.status === "rejected" || dealsResult.status === "rejected";

  if (storeResult.status === "rejected") {
    // eslint-disable-next-line no-console
    console.error("[magasins/page] store fetch failed", {
      slug: storeSlug,
      err: storeResult.reason,
    });
  }
  if (dealsResult.status === "rejected") {
    // eslint-disable-next-line no-console
    console.error("[magasins/page] deals fetch failed", {
      slug: storeSlug,
      err: dealsResult.reason,
    });
  }

  // Si même la fiche store est inaccessible ET qu'on n'a pas de store
  // seed, c'est un vrai 404. Sinon on retombe sur le store seedé.
  if (!store) notFound();

  const h1 = `Promo ${store.name}`;
  const intro = buildStoreIntro(store.name, store.city?.name ?? "Guyane");
  const faq = buildStoreFaq(store.name);

  const jsonLdChunks = [
    buildCollectionPageJsonLd({
      name: h1,
      description: intro,
      path: getStorePath(store.slug),
    }),
    buildBreadcrumbJsonLd([
      { name: "Accueil", url: "/" },
      { name: "Bons plans", url: "/bons-plans" },
      { name: "Magasins", url: "/bons-plans/guyane" },
      { name: store.name, url: getStorePath(store.slug) },
    ]),
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

      <SeoIntro h1={h1} intro={intro} eyebrow="Promos par enseigne" />

      <section className="mt-5 rounded-xl border border-border bg-card p-4 sm:p-5">
        {loadFailed && (
          <div
            role="status"
            className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 sm:text-sm"
          >
            Certaines informations sont temporairement indisponibles. Réessaie
            dans quelques secondes.
          </div>
        )}
        <h2 className="font-display text-lg font-semibold text-ink-900">
          Informations magasin
        </h2>
        <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
          {store.city?.name && (
            <li>
              Commune:{" "}
              <span className="font-medium text-foreground">
                {store.city.name}
              </span>
            </li>
          )}
          {store.address && (
            <li>
              Adresse: <span className="font-medium text-foreground">{store.address}</span>
            </li>
          )}
          {store.website && (
            <li>
              Site officiel:{" "}
              <a
                href={store.website}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="font-medium text-peyi-orange-700 hover:underline"
              >
                {store.website}
              </a>
            </li>
          )}
        </ul>

        <p className="mt-4 text-sm text-muted-foreground">
          {total.toLocaleString("fr-FR")} bon plan{total > 1 ? "s" : ""} actif{total > 1 ? "s" : ""} lié{total > 1 ? "s" : ""} à cette enseigne.
        </p>

        {deals.length === 0 ? (
          <div className="mt-3 rounded-lg border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
            Pas encore assez d’offres visibles pour cette enseigne.
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
            href="/bons-plans/guyane"
            className="inline-flex items-center rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:border-peyi-orange-300 hover:text-peyi-orange-700"
          >
            Voir tous les bons plans en Guyane
          </Link>
        </div>
      </section>

      <div className="mt-5 space-y-5">
        <ExplorerAlso links={buildStoreExploreLinks(store.slug)} />
        <SeoFaq items={faq} />
      </div>
    </main>
  );
}
