/**
 * Dev-only seed: fake users + 10 bons plans to feed the UI.
 *
 * Only "vraies bonnes affaires" (temperature >= 100) are kept —
 * lukewarm or cold deals have been pruned.
 *
 * Run with:  npm run db:seed-dev
 *
 * Safe to re-run: clears deals/dealImages/votes/comments/favorites
 * and the 6 demo users before re-inserting. Does NOT touch prod
 * reference data (cities, categories, stores, merchants, plans, badges).
 */
import { PrismaClient, DealStatus } from "@prisma/client";
import crypto from "node:crypto";
import { PERSONAS, karmaLevel } from "../scripts/ingest/personas";

const prisma = new PrismaClient();

// ---------- helpers ----------

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function shortId(): string {
  return crypto.randomBytes(3).toString("hex"); // 6 hex chars
}

function hoursAgo(h: number): Date {
  return new Date(Date.now() - h * 60 * 60 * 1000);
}

function discountPercent(price: number, original?: number | null): number | null {
  if (!original || original <= price) return null;
  return Math.round(((original - price) / original) * 100);
}

// Les 6 premiers personas servent aux deals de dev hardcodés ci-dessous.
// Le pool complet (12) est utilisé par scripts/ingest pour l'ingestion
// multi-source — ça garantit que les deux chemins partagent les mêmes
// comptes et qu'aucun username ne se contredit.
const DEMO_USERS = PERSONAS.slice(0, 6).map((p) => ({
  username: p.username,
  fullName: p.fullName,
  citySlug: p.citySlug,
  karma: p.karma,
})) as ReadonlyArray<{
  username: string;
  fullName: string;
  citySlug: string;
  karma: number;
}>;

// Deal templates. cityS / storeS / merchantS are slugs resolved at runtime.
// ageHours controls publishedAt (smaller = more recent). Temperature is
// set directly; upvotes/downvotes are cosmetic counts for the UI.
type DealTemplate = {
  title: string;
  description: string;
  price: number;
  originalPrice?: number;
  categoryS: string;
  authorIdx: number;
  citeS?: string;
  storeS?: string;
  merchantS?: string;
  temperature: number;
  upvotes: number;
  downvotes: number;
  comments: number;
  views: number;
  ageHours: number;
  isFree?: boolean;
  externalUrl?: string;
};

const DEALS: DealTemplate[] = [
  {
    title: "iPhone 15 128 Go noir à 799€ au lieu de 969€",
    description:
      "Promo valable en magasin uniquement, rayon multimédia. J'y étais ce matin, il reste du stock. Facture Fnac pour la garantie.",
    price: 799,
    originalPrice: 969,
    categoryS: "tech-multimedia",
    authorIdx: 0,
    citeS: "cayenne",
    storeS: "fnac-cayenne",
    temperature: 312,
    upvotes: 48,
    downvotes: 6,
    comments: 23,
    views: 1840,
    ageHours: 6,
  },
  {
    title: "Barbecue Weber Q1200 à 249€ au lieu de 349€",
    description:
      "Parfait pour les grillades du week-end, on en a pris 2 avec mon frère. Modèle gaz portable, super pour la plage.",
    price: 249,
    originalPrice: 349,
    categoryS: "bricolage-jardin",
    authorIdx: 1,
    citeS: "matoury",
    storeS: "carrefour-matoury",
    temperature: 187,
    upvotes: 31,
    downvotes: 4,
    comments: 12,
    views: 920,
    ageHours: 14,
  },
  {
    title: "Casque Sony WH-1000XM5 à 279€ (livraison offerte)",
    description:
      "Prix cassé sur Amazon, livraison rapide en Guyane. Le meilleur casque à réduction de bruit du marché, top pour les vols long-courriers.",
    price: 279,
    originalPrice: 399,
    categoryS: "tech-multimedia",
    authorIdx: 3,
    merchantS: "amazon",
    externalUrl: "https://www.amazon.fr/sony-wh-1000xm5",
    temperature: 254,
    upvotes: 41,
    downvotes: 3,
    comments: 18,
    views: 1320,
    ageHours: 22,
  },
  {
    title: "PS5 Slim édition Fortnite à 449€ au lieu de 549€",
    description:
      "Pack PS5 Slim avec code Fortnite. Dispo sur Cdiscount, rupture probable rapidement. Expédié depuis métropole (compter 5-7j).",
    price: 449,
    originalPrice: 549,
    categoryS: "tech-multimedia",
    authorIdx: 2,
    merchantS: "cdiscount",
    externalUrl: "https://www.cdiscount.com/ps5-slim",
    temperature: 428,
    upvotes: 67,
    downvotes: 8,
    comments: 42,
    views: 3100,
    ageHours: 3,
  },
  {
    title: "Vol Cayenne-Paris Air France à 590€ aller-retour",
    description:
      "Tarif continental appliqué, dates flexibles mai-juin. Réservé hier via le site AF, ça passe bien en classe économique avec bagage 23kg.",
    price: 590,
    originalPrice: 890,
    categoryS: "voyages-vols",
    authorIdx: 0,
    externalUrl: "https://www.airfrance.fr",
    temperature: 510,
    upvotes: 82,
    downvotes: 5,
    comments: 61,
    views: 4250,
    ageHours: 10,
  },
  {
    title: "Pack couches Pampers Baby-Dry x192 à 39€",
    description:
      "Promo chez Carrefour Matoury. 192 couches taille 4, bon plan pour stocker avant l'arrivée du container en retard.",
    price: 39,
    originalPrice: 59,
    categoryS: "enfants-bebe",
    authorIdx: 1,
    citeS: "matoury",
    storeS: "carrefour-matoury",
    temperature: 132,
    upvotes: 25,
    downvotes: 3,
    comments: 9,
    views: 680,
    ageHours: 36,
  },
  {
    title: "Smart TV Samsung 55\" QLED à 499€ au lieu de 799€",
    description:
      "Modèle 2024 avec Tizen OS. Excellent piqué d'image, son correct. Dispo en magasin Family Plaza et sur darty.com.",
    price: 499,
    originalPrice: 799,
    categoryS: "tech-multimedia",
    authorIdx: 3,
    citeS: "matoury",
    storeS: "darty-matoury",
    merchantS: "darty",
    temperature: 201,
    upvotes: 33,
    downvotes: 4,
    comments: 14,
    views: 1120,
    ageHours: 18,
  },
  {
    title: "Aspirateur Dyson V11 Absolute à 399€",
    description:
      "Meilleur prix vu depuis 6 mois. Référence indétrônable. J'ai pris le mien la semaine dernière, autonomie 60min en mode éco.",
    price: 399,
    originalPrice: 649,
    categoryS: "maison-electromenager",
    authorIdx: 4,
    merchantS: "amazon",
    externalUrl: "https://www.amazon.fr/dyson-v11",
    temperature: 278,
    upvotes: 44,
    downvotes: 5,
    comments: 17,
    views: 1580,
    ageHours: 8,
  },
  {
    title: "Machine Nespresso Vertuo Pop à 89€ + 80 capsules offertes",
    description:
      "Bundle Amazon avec 80 capsules offertes (valeur 35€). Le modèle Pop est compact, parfait pour un studio.",
    price: 89,
    originalPrice: 149,
    categoryS: "maison-electromenager",
    authorIdx: 2,
    merchantS: "amazon",
    externalUrl: "https://www.amazon.fr/nespresso-vertuo-pop",
    temperature: 156,
    upvotes: 28,
    downvotes: 3,
    comments: 8,
    views: 740,
    ageHours: 20,
  },
  {
    title: "Arrivage conteneur bois — Kourou ce samedi",
    description:
      "Planches, poutres et panneaux OSB à prix métropole, -30%. Quantité limitée, arrivée confirmée par le dépôt. Se pointer tôt.",
    price: 1,
    categoryS: "arrivages-conteneurs",
    authorIdx: 3,
    citeS: "kourou",
    temperature: 165,
    upvotes: 29,
    downvotes: 2,
    comments: 11,
    views: 890,
    ageHours: 16,
  },
];

// ---------- main ----------

async function main() {
  console.log("🧹 Cleaning previous dev data...");

  await prisma.dealImage.deleteMany({});
  await prisma.vote.deleteMany({});
  await prisma.comment.deleteMany({});
  await prisma.favorite.deleteMany({});
  await prisma.deal.deleteMany({});
  await prisma.user.deleteMany({
    where: { username: { in: DEMO_USERS.map((u) => u.username) } },
  });

  console.log("👤 Creating demo users...");

  const users = [];
  for (const u of DEMO_USERS) {
    const city = await prisma.city.findUnique({ where: { slug: u.citySlug } });
    const user = await prisma.user.create({
      data: {
        email: `${u.username}@peyi.dev`,
        username: u.username,
        fullName: u.fullName,
        phoneVerified: true,
        cityId: city?.id,
        karma: u.karma,
        level: karmaLevel(u.karma),
      },
    });
    users.push(user);
  }
  console.log(`  ✅ ${users.length} users`);

  console.log("🔥 Creating deals...");

  let created = 0;
  for (const t of DEALS) {
    const category = await prisma.category.findUnique({ where: { slug: t.categoryS } });
    if (!category) {
      console.warn(`  ⚠️  skipping "${t.title}" — category ${t.categoryS} not found`);
      continue;
    }

    const city = t.citeS
      ? await prisma.city.findUnique({ where: { slug: t.citeS } })
      : null;
    const store = t.storeS
      ? await prisma.store.findUnique({ where: { slug: t.storeS } })
      : null;
    const merchant = t.merchantS
      ? await prisma.merchant.findUnique({ where: { slug: t.merchantS } })
      : null;

    const publishedAt = hoursAgo(t.ageHours);
    const slug = `${slugify(t.title)}-${shortId()}`;

    await prisma.deal.create({
      data: {
        authorId: users[t.authorIdx].id,
        title: t.title,
        slug,
        description: t.description,
        price: t.price,
        originalPrice: t.originalPrice,
        discountPercent: discountPercent(t.price, t.originalPrice),
        isFree: t.isFree ?? false,
        cityId: city?.id,
        storeId: store?.id,
        categoryId: category.id,
        merchantId: merchant?.id,
        externalUrl: t.externalUrl,
        temperature: t.temperature,
        upvotes: t.upvotes,
        downvotes: t.downvotes,
        commentCount: t.comments,
        viewCount: t.views,
        status: DealStatus.PUBLISHED,
        publishedAt,
        createdAt: publishedAt,
      },
    });
    created += 1;
  }

  console.log(`  ✅ ${created} deals`);
  console.log("✨ Dev seed done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
