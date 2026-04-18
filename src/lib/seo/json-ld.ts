import type { Prisma } from "@prisma/client";

import { getSiteUrl } from "@/lib/site-url";

/**
 * Helpers de construction des snippets JSON-LD schema.org. Chaque
 * fonction retourne un objet sérialisable — l'appelant l'injecte via
 * `<script type="application/ld+json" dangerouslySetInnerHTML=...>`
 * côté RSC. On reste en `Record<string, unknown>` plutôt qu'en types
 * stricts schema.org (typologies lourdes et instables) pour rester
 * léger.
 *
 * Règles :
 *   - Toutes les URLs sortantes sont ABSOLUES (préfixées par getSiteUrl).
 *     Google refuse les `@id` relatifs.
 *   - On évite d'inclure des champs à `undefined` : Google les tolère
 *     mais les tools de validation les marquent en warning. On omet
 *     donc proprement via des conditionals.
 *   - `@context` est toujours `"https://schema.org"` (https, pas http).
 *
 * Pour vérifier le rendu : [Rich Results Test](https://search.google.com/test/rich-results)
 * ou [Schema Markup Validator](https://validator.schema.org/).
 */

type JsonLd = Record<string, unknown>;

// -----------------------------------------------------------------------------
// Organization + WebSite (root layout)
// -----------------------------------------------------------------------------

/**
 * Identité de l'organisation éditrice (Péyi). On le pose au root
 * layout pour que chaque page hérite du signal "qui est ce site".
 * C'est ce qui alimente notamment la knowledge panel côté Google.
 */
export function buildOrganizationJsonLd(): JsonLd {
  const base = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${base}/#organization`,
    name: "Péyi",
    url: base,
    logo: `${base}/icon`,
    description:
      "Plateforme communautaire des bons plans et petites annonces 100% Guyane.",
    areaServed: {
      "@type": "Country",
      name: "Guyane française",
    },
    contactPoint: {
      "@type": "ContactPoint",
      email: "contact@peyi.gf",
      contactType: "customer service",
      availableLanguage: ["French"],
    },
  };
}

/**
 * Déclare le site et son endpoint de recherche interne. Google utilise
 * `SearchAction` pour afficher une sitelinks search box directement
 * dans les résultats — signal fort d'identité de marque.
 */
export function buildWebSiteJsonLd(): JsonLd {
  const base = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${base}/#website`,
    url: base,
    name: "Péyi",
    description:
      "Les bons plans et petites annonces 100% Guyane. Partage, vote et profite.",
    inLanguage: "fr-FR",
    publisher: { "@id": `${base}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${base}/bons-plans?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

// -----------------------------------------------------------------------------
// Breadcrumbs
// -----------------------------------------------------------------------------

type BreadcrumbItem = { name: string; url: string };

/**
 * `BreadcrumbList` schema.org. Aide Google à afficher le fil
 * d'ariane directement dans les résultats de recherche, ce qui
 * augmente le taux de clic et donne du contexte au crawler.
 *
 * Les URLs passées peuvent être relatives (on les absolutise ici).
 */
export function buildBreadcrumbJsonLd(items: BreadcrumbItem[]): JsonLd {
  const base = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: item.name,
      item: item.url.startsWith("http") ? item.url : `${base}${item.url}`,
    })),
  };
}

// -----------------------------------------------------------------------------
// Deal → Product + Offer
// -----------------------------------------------------------------------------

type DealJsonLdInput = {
  slug: string;
  title: string;
  description: string | null;
  price: Prisma.Decimal;
  currency: string;
  isFree: boolean;
  expiresAt: Date | null;
  publishedAt: Date;
  coverImageUrl: string | null;
  category: { name: string };
  city: { name: string } | null;
  store: { name: string } | null;
  merchant: { name: string } | null;
  author: { username: string };
};

/**
 * Deal → `Product` avec une `Offer` imbriquée. Choix notables :
 *   - `availability` = InStock si le deal est toujours actif (pas
 *     expiré et visible sur la page), OutOfStock sinon. La page
 *     appelante ne rendra de JSON-LD que pour les deals publiés et
 *     non expirés, donc en pratique c'est toujours InStock ici —
 *     on garde la logique explicite pour rester robuste si un jour
 *     on affiche les deals périmés.
 *   - `seller` = le store ou le merchant si renseigné ; sinon
 *     l'auteur (user) comme `Person`. Sans seller, Google rejette
 *     la rich card — c'est un champ de qualité obligatoire.
 *   - `priceValidUntil` = expiresAt si dispo. Google bannit les
 *     Offers sans priceValidUntil depuis ~2022 (warning dans
 *     Search Console, pas d'erreur dure).
 */
export function buildDealJsonLd(deal: DealJsonLdInput): JsonLd {
  const base = getSiteUrl();
  const url = `${base}/bons-plans/${deal.slug}`;
  const now = new Date();
  const isAvailable = !deal.expiresAt || deal.expiresAt > now;

  const sellerName = deal.store?.name ?? deal.merchant?.name ?? null;
  const seller: JsonLd = sellerName
    ? { "@type": "Organization", name: sellerName }
    : { "@type": "Person", name: `@${deal.author.username}` };

  const description =
    deal.description?.replace(/\s+/g, " ").trim().slice(0, 5000) ||
    `Bon plan ${deal.category.name.toLowerCase()}${deal.city ? ` à ${deal.city.name}` : ""} partagé sur Péyi.`;

  const offer: JsonLd = {
    "@type": "Offer",
    url,
    price: deal.isFree ? "0" : deal.price.toString(),
    priceCurrency: deal.currency,
    availability: isAvailable
      ? "https://schema.org/InStock"
      : "https://schema.org/OutOfStock",
    seller,
  };
  if (deal.expiresAt) {
    offer.priceValidUntil = deal.expiresAt.toISOString().slice(0, 10);
  }

  const result: JsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: deal.title,
    description,
    url,
    category: deal.category.name,
    offers: offer,
  };
  if (deal.coverImageUrl) {
    result.image = deal.coverImageUrl;
  }
  return result;
}

// -----------------------------------------------------------------------------
// Listing → Product + Offer
// -----------------------------------------------------------------------------

type ListingJsonLdInput = {
  slug: string;
  title: string;
  description: string;
  price: Prisma.Decimal | null;
  currency: string;
  priceType: string;
  condition: string | null;
  coverImageUrl: string | null;
  images: { url: string }[];
  category: { name: string };
  city: { name: string };
  author: { username: string };
  publishedAt: Date;
};

// Mapping ItemCondition Prisma → schema.org ItemCondition URL.
// Google utilise ces valeurs exactes pour les Product rich results.
const CONDITION_MAP: Record<string, string> = {
  NEW: "https://schema.org/NewCondition",
  LIKE_NEW: "https://schema.org/NewCondition",
  VERY_GOOD: "https://schema.org/UsedCondition",
  GOOD: "https://schema.org/UsedCondition",
  ACCEPTABLE: "https://schema.org/UsedCondition",
  FOR_PARTS: "https://schema.org/DamagedCondition",
};

/**
 * Listing → `Product` avec `Offer`. Contrairement aux deals, les
 * listings sont C2C (particulier à particulier) donc le seller est
 * toujours une `Person` (jamais une Organization).
 *
 * Prix : certains listings n'ont pas de prix fixe (NEGOTIABLE,
 * ON_REQUEST, FREE). Pour NEGOTIABLE/ON_REQUEST on met le prix
 * saisi avec une availability standard ; pour FREE ou price=null
 * on met price=0.
 */
export function buildListingJsonLd(listing: ListingJsonLdInput): JsonLd {
  const base = getSiteUrl();
  const url = `${base}/annonces/${listing.slug}`;

  const description =
    listing.description.replace(/\s+/g, " ").trim().slice(0, 5000) ||
    `${listing.category.name} à ${listing.city.name} sur Péyi.`;

  const priceString = listing.price
    ? listing.price.toString()
    : listing.priceType === "FREE"
      ? "0"
      : "0"; // ON_REQUEST fallback

  const offer: JsonLd = {
    "@type": "Offer",
    url,
    price: priceString,
    priceCurrency: listing.currency,
    availability: "https://schema.org/InStock",
    seller: {
      "@type": "Person",
      name: `@${listing.author.username}`,
    },
    areaServed: {
      "@type": "City",
      name: listing.city.name,
    },
  };

  const result: JsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: listing.title,
    description,
    url,
    category: listing.category.name,
    offers: offer,
  };

  // Image principale + galerie si disponible. Google Product rich
  // results apprécie plusieurs images (qualité du snippet).
  const allImages = [
    listing.coverImageUrl,
    ...listing.images.map((i) => i.url),
  ].filter((u): u is string => Boolean(u));
  if (allImages.length > 0) {
    result.image = allImages.slice(0, 4); // cap à 4 pour garder le JSON léger
  }

  if (listing.condition && CONDITION_MAP[listing.condition]) {
    result.itemCondition = CONDITION_MAP[listing.condition];
  }

  return result;
}

// -----------------------------------------------------------------------------
// Helper d'injection
// -----------------------------------------------------------------------------

/**
 * Produit la chaîne JSON à injecter dans un `<script type="application/ld+json">`.
 * On passe par `JSON.stringify` et on échappe les `</script>` pour
 * éviter qu'un contenu utilisateur pollué (ex. description) ne casse
 * le parsing HTML.
 */
export function serializeJsonLd(data: JsonLd | JsonLd[]): string {
  return JSON.stringify(data).replace(/<\/script/gi, "<\\/script");
}
