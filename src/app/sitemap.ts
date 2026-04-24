import type { MetadataRoute } from "next";

import { prisma } from "@/lib/prisma";
import { getSiteUrl } from "@/lib/site-url";

/**
 * Sitemap dynamique servi à `/sitemap.xml`. Next 14 sérialise
 * automatiquement le tableau retourné ici au format XML, y compris
 * les champs `lastModified`, `changeFrequency` et `priority`.
 *
 * Stratégie d'inclusion :
 *   - Pages statiques (home, listings, annonces, légal)
 *   - Deals publiés et NON expirés → indexables
 *   - Listings publiés (tous statuts `PUBLISHED`, même "vendu/loué"
 *     temporairement ? Non — cf. plus bas)
 *   - Catégories actives (type DEAL/LISTING/BOTH) → pages de filtrage
 *   - Communes → pages de filtrage par ville
 *
 * On EXCLUT :
 *   - Pages privées (/profil, /messages, /admin, /notifications, /api, …)
 *   - Deals expirés (expiresAt < now) : inutile d'envoyer du contenu
 *     périmé au crawler, ça pollue l'index et déclasse le site
 *   - Listings non-PUBLISHED (DRAFT, PENDING_REVIEW, SOLD, EXPIRED,
 *     REJECTED, REMOVED, ARCHIVED)
 *
 * Cache & fraîcheur :
 *   Next re-génère le sitemap à chaque revalidation ; avec `revalidate`
 *   déclaré plus bas on régénère au plus toutes les heures. Google re-
 *   crawle le sitemap régulièrement donc ça suffit largement.
 *
 * Cap de volume :
 *   Le standard sitemap autorise 50 000 URLs / 50 MB max. À l'échelle
 *   Péyi (Guyane ~300k habitants), on restera bien sous ce cap pendant
 *   des années. Si un jour on dépasse, il faudra splitter via
 *   `generateSitemaps` (Next 14 supporte sitemap index).
 */
// `force-dynamic` au lieu de `revalidate` : Prisma peut hang 60s côté
// pgbouncer Supabase quand le pool est saturé (cold start Vercel + plusieurs
// builds concurrents). Next retry 3 fois à 60s chacun → build échoue après
// 3 minutes. En dynamic, le sitemap est calculé à la première requête
// runtime (googlebot), Vercel edge cache la réponse ensuite.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const now = new Date();

  // --- 1. Pages statiques ----------------------------------------------------
  // Ces URLs sont des points d'entrée majeurs. Fréquence et priorité
  // calibrées pour guider le crawler sans mentir.
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${base}/`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${base}/bons-plans`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${base}/annonces`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    // Pages légales — changent très rarement, priorité basse mais il
    // faut qu'elles soient indexées pour l'E-E-A-T (signal de confiance
    // aux crawlers).
    {
      url: `${base}/confidentialite`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${base}/cgu`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${base}/cookies`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${base}/mentions-legales`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];

  // --- 2. Deals publiés non expirés -----------------------------------------
  // `updatedAt` comme lastModified : suit les boosts/bumps et garde le
  // sitemap frais pour les contenus qui bougent.
  // Les 4 requêtes Prisma sont enveloppées en `.catch` pour que le build
  // Vercel ne tombe PAS si le pool de connexions est saturé ou si la DB
  // hoquette : le sitemap se régénère au prochain revalidate (1h).
  const deals = await prisma.deal
    .findMany({
      where: {
        status: "PUBLISHED",
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error("[sitemap] deals query failed", err);
      return [] as Array<{ slug: string; updatedAt: Date }>;
    });
  const dealRoutes: MetadataRoute.Sitemap = deals.map((d) => ({
    url: `${base}/bons-plans/${d.slug}`,
    lastModified: d.updatedAt,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  // --- 3. Listings publiés --------------------------------------------------
  const listings = await prisma.listing
    .findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error("[sitemap] listings query failed", err);
      return [] as Array<{ slug: string; updatedAt: Date }>;
    });
  const listingRoutes: MetadataRoute.Sitemap = listings.map((l) => ({
    url: `${base}/annonces/${l.slug}`,
    lastModified: l.updatedAt,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  // --- 4. Catégories (filtres) ----------------------------------------------
  // On indexe les pages filtrées par catégorie — c'est du longtail très
  // utile ("bons plans tech guyane", "voitures occasion cayenne", etc.).
  // Type BOTH apparaît sur les deux sections.
  const categories = await prisma.category
    .findMany({
      where: { isActive: true },
      select: { slug: true, type: true },
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error("[sitemap] categories query failed", err);
      return [] as Array<{ slug: string; type: "DEAL" | "LISTING" | "BOTH" }>;
    });
  // Note: Category n'a pas d'updatedAt dans le schéma — on met now().
  const categoryRoutes: MetadataRoute.Sitemap = categories.flatMap((c) => {
    const routes: MetadataRoute.Sitemap = [];
    if (c.type === "DEAL" || c.type === "BOTH") {
      routes.push({
        url: `${base}/bons-plans?category=${c.slug}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.5,
      });
    }
    if (c.type === "LISTING" || c.type === "BOTH") {
      routes.push({
        url: `${base}/annonces?category=${c.slug}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.5,
      });
    }
    return routes;
  });

  // --- 5. Communes (filtres ville) ------------------------------------------
  // Idem : du longtail local ("bons plans kourou", "annonces matoury").
  // On ne fait PAS le produit cartésien ville×catégorie pour éviter la
  // bloat (potentiellement 100+ URLs redondantes). Google sait combiner
  // les signaux sans qu'on lui mâche tout.
  const cities = await prisma.city
    .findMany({
      select: { slug: true },
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error("[sitemap] cities query failed", err);
      return [] as Array<{ slug: string }>;
    });
  const cityRoutes: MetadataRoute.Sitemap = cities.flatMap((c) => [
    {
      url: `${base}/bons-plans?city=${c.slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.5,
    },
    {
      url: `${base}/annonces?city=${c.slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.5,
    },
  ]);

  return [
    ...staticRoutes,
    ...dealRoutes,
    ...listingRoutes,
    ...categoryRoutes,
    ...cityRoutes,
  ];
}
