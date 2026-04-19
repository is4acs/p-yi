/**
 * Dev-only seed: annonces Véhicules (7 sous-catégories).
 *
 * Couvre les 7 feuilles de la branche `vehicules` du tree catégories :
 *   voitures, motos-scooters, quads-buggy, utilitaires-4x4,
 *   pirogues-bateaux, velos, pieces-accessoires-vehicules.
 *
 * Les auteurs sont les 12 personas dev partagés avec `seed-dev.ts` et
 * l'ingest CLI — upsert safe sur username. Les annonces elles-mêmes
 * sont effacées puis recréées à chaque run (match par authorId ∈ demo
 * users ET catégorie ∈ feuilles véhicules), donc la commande est
 * idempotente et ne touche jamais aux annonces réelles.
 *
 * Run :  npm run db:seed-listings:vehicules
 */
import {
  PrismaClient,
  ItemCondition,
  ListingStatus,
  ListingType,
  PriceType,
  Prisma,
} from "@prisma/client";
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
  return crypto.randomBytes(3).toString("hex");
}

function daysFromNow(d: number): Date {
  return new Date(Date.now() + d * 24 * 60 * 60 * 1000);
}

// Colonnes indexées dénormalisées — doivent rester cohérentes avec
// `denormalizeAttributes` dans src/lib/listings/field-registry.ts. On
// réimplémente ici en mini (pas d'accès à l'alias `@/` depuis tsx)
// plutôt que d'importer — l'essentiel est que les colonnes indexées
// collent au JSON pour que les filtres feuillent correctement.
type Attrs = Record<string, string | number | boolean | null>;

function denorm(attrs: Attrs) {
  const intOf = (k: string) => {
    const v = attrs[k];
    return typeof v === "number" && Number.isFinite(v) ? Math.round(v) : null;
  };
  const smallIntOf = (k: string) => {
    const v = intOf(k);
    if (v === null) return null;
    return v < -32768 || v > 32767 ? null : v;
  };
  const strOf = (k: string) => {
    const v = attrs[k];
    return typeof v === "string" && v.trim() ? v.trim().slice(0, 64) : null;
  };
  return {
    attrYear: smallIntOf("annee"),
    attrMileageKm: intOf("kilometrage"),
    attrSurfaceM2: smallIntOf("surface"),
    attrRooms: smallIntOf("pieces"),
    attrBrand: strOf("marque"),
    attrFuel: strOf("carburant"),
    attrContract: strOf("type_contrat"),
  };
}

// ---------- données ----------

type Template = {
  categoryS: string;
  authorIdx: number; // index dans PERSONAS
  citeS: string;
  title: string;
  description: string;
  type: ListingType;
  priceType: PriceType;
  price: number | null;
  condition?: ItemCondition;
  neighborhood?: string;
  attrs: Attrs;
};

const LISTINGS: Template[] = [
  // ----- Voitures -----
  {
    categoryS: "voitures",
    authorIdx: 0,
    citeS: "cayenne",
    title: "Toyota Hilux 2020 — 85 000 km, très bon état",
    description:
      "Pick-up double cabine entretenu chez Toyota Cayenne, carnet à jour. 4 pneus récents, attelage, galerie de toit. CT OK. Visible après 17h sur Cayenne.",
    type: ListingType.OFFER,
    priceType: PriceType.NEGOTIABLE,
    price: 32500,
    condition: ItemCondition.VERY_GOOD,
    neighborhood: "Cayenne centre",
    attrs: {
      marque: "Toyota",
      modele: "Hilux Double Cabine",
      annee: 2020,
      kilometrage: 85000,
      carburant: "diesel",
      boite: "manuelle",
      puissance: 150,
      portes: "4",
      places: 5,
      couleur: "Gris métal",
      ct_valide: true,
    },
  },
  {
    categoryS: "voitures",
    authorIdx: 4,
    citeS: "remire-montjoly",
    title: "Peugeot 208 essence 2019 — idéale 1er achat",
    description:
      "Citadine parfaite pour Cayenne/Rémire. Climatisation OK, Bluetooth, 4 pneus bon état. Entretien à jour, clés de rechange. Pas d'accident.",
    type: ListingType.OFFER,
    priceType: PriceType.FIXED,
    price: 11900,
    condition: ItemCondition.GOOD,
    neighborhood: "Montjoly",
    attrs: {
      marque: "Peugeot",
      modele: "208",
      annee: 2019,
      kilometrage: 62000,
      carburant: "essence",
      boite: "manuelle",
      puissance: 82,
      portes: "5",
      places: 5,
      couleur: "Blanc",
      ct_valide: true,
    },
  },

  // ----- Motos & Scooters -----
  {
    categoryS: "motos-scooters",
    authorIdx: 9,
    citeS: "remire-montjoly",
    title: "Yamaha MT-07 2021 — 12 000 km",
    description:
      "Moto en parfait état, pneus Michelin récents. Échappement d'origine + Akrapovic fourni. Gravage SRA. Première main.",
    type: ListingType.OFFER,
    priceType: PriceType.NEGOTIABLE,
    price: 6500,
    condition: ItemCondition.LIKE_NEW,
    attrs: {
      marque: "Yamaha",
      modele: "MT-07",
      annee: 2021,
      kilometrage: 12000,
      cylindree: 689,
      permis: "A2",
      ct_valide: true,
    },
  },
  {
    categoryS: "motos-scooters",
    authorIdx: 5,
    citeS: "cayenne",
    title: "Scooter Peugeot Kisbee 50 — idéal trajets ville",
    description:
      "Scooter 50cc carburation neuve, démarre au quart de tour. Top-case 30L inclus. Parfait pour livreurs / étudiants.",
    type: ListingType.OFFER,
    priceType: PriceType.NEGOTIABLE,
    price: 1100,
    condition: ItemCondition.GOOD,
    attrs: {
      marque: "Peugeot",
      modele: "Kisbee 50",
      annee: 2018,
      kilometrage: 9400,
      cylindree: 50,
      permis: "AM",
    },
  },

  // ----- Quads & Buggy -----
  {
    categoryS: "quads-buggy",
    authorIdx: 1,
    citeS: "kourou",
    title: "Quad CF Moto 450L 2022 — utilitaire forestier",
    description:
      "Utilisé en piste Kourou-Sinnamary, treuil Warn 3500, pneus boue neufs. Carte grise quad routier.",
    type: ListingType.OFFER,
    priceType: PriceType.FIXED,
    price: 6800,
    condition: ItemCondition.VERY_GOOD,
    attrs: {
      marque: "CF Moto",
      modele: "CForce 450L",
      annee: 2022,
      kilometrage: 3200,
      cylindree: 400,
      permis: "A",
      ct_valide: true,
    },
  },

  // ----- Utilitaires & 4×4 -----
  {
    categoryS: "utilitaires-4x4",
    authorIdx: 11,
    citeS: "kourou",
    title: "Renault Master L2H2 2019 — fourgon pro",
    description:
      "Fourgon aménagé bois au sol et cloisons. Clim, caméra de recul, 3 places. Suivi concession. Prêt pour artisan BTP.",
    type: ListingType.OFFER,
    priceType: PriceType.NEGOTIABLE,
    price: 18900,
    condition: ItemCondition.GOOD,
    attrs: {
      marque: "Renault",
      modele: "Master L2H2",
      annee: 2019,
      kilometrage: 135000,
      carburant: "diesel",
      boite: "manuelle",
      charge_utile: 1200,
      places: 3,
      volume_coffre: 10,
    },
  },

  // ----- Pirogues & Bateaux -----
  {
    categoryS: "pirogues-bateaux",
    authorIdx: 11,
    citeS: "saint-laurent-du-maroni",
    title: "Pirogue alu 7m + Yamaha 40 CV",
    description:
      "Pirogue alu 7m, coque saine. Moteur Yamaha 40 CV 2 temps, démarrage électrique, 420 h. Remorque simple essieu incluse. Idéale Maroni.",
    type: ListingType.OFFER,
    priceType: PriceType.NEGOTIABLE,
    price: 8500,
    condition: ItemCondition.GOOD,
    attrs: {
      type_embarcation: "Pirogue alu",
      longueur: 7,
      annee: 2015,
      moteur: "Yamaha 40 CV 2T",
      heures_moteur: 420,
      remorque_incluse: true,
    },
  },

  // ----- Vélos -----
  {
    categoryS: "velos",
    authorIdx: 9,
    citeS: "remire-montjoly",
    title: "VTT électrique Rockrider E-ST 500 — très peu servi",
    description:
      "VAE semi-rigide, batterie 418 Wh, autonomie 70 km. Compteur d'origine. Révision Decathlon faite. Taille M cadre alu.",
    type: ListingType.OFFER,
    priceType: PriceType.FIXED,
    price: 950,
    condition: ItemCondition.LIKE_NEW,
    attrs: {
      type_velo: "vae",
      marque: "Rockrider",
      taille_cadre: "M",
      annee: 2023,
    },
  },
  {
    categoryS: "velos",
    authorIdx: 6,
    citeS: "kourou",
    title: "Vélo enfant 20 pouces — à donner",
    description:
      "Vélo 20\" pour enfant 7-10 ans. Fonctionnel, à rafraîchir (selle + poignées). À récupérer sur place.",
    type: ListingType.DONATION,
    priceType: PriceType.FREE,
    price: null,
    condition: ItemCondition.ACCEPTABLE,
    attrs: {
      type_velo: "enfant",
      marque: "Btwin",
    },
  },

  // ----- Pièces & Accessoires -----
  {
    categoryS: "pieces-accessoires-vehicules",
    authorIdx: 0,
    citeS: "cayenne",
    title: "Jantes Toyota Hilux 17\" + pneus BF Goodrich",
    description:
      "4 jantes alu d'origine Hilux 2020 avec pneus AT BF Goodrich 265/65 R17 — 60 % de gomme restante. Prêt à monter.",
    type: ListingType.OFFER,
    priceType: PriceType.NEGOTIABLE,
    price: 650,
    condition: ItemCondition.VERY_GOOD,
    attrs: {
      type_piece: "roues_pneus",
      etat_piece: "occasion",
      marque_vehicule: "Toyota",
      modele_vehicule: "Hilux",
    },
  },
];

const DEMO_USERNAMES = PERSONAS.map((p) => p.username);
const VEHICLE_LEAF_SLUGS = [
  "voitures",
  "motos-scooters",
  "quads-buggy",
  "utilitaires-4x4",
  "pirogues-bateaux",
  "velos",
  "pieces-accessoires-vehicules",
];

// ---------- main ----------

async function main() {
  console.log("🚗 Seed annonces Véhicules");

  // 1) Upsert des 12 personas (partagés avec seed-dev.ts). On n'efface
  //    pas les users : ils peuvent avoir des deals associés via l'autre
  //    seed, un `delete` cascaderait tout.
  console.log("👤 Upsert demo users...");
  const userIdByUsername = new Map<string, string>();
  for (const p of PERSONAS) {
    const city = await prisma.city.findUnique({ where: { slug: p.citySlug } });
    const user = await prisma.user.upsert({
      where: { username: p.username },
      update: {},
      create: {
        email: `${p.username}@peyi.dev`,
        username: p.username,
        fullName: p.fullName,
        phoneVerified: true,
        cityId: city?.id,
        karma: p.karma,
        level: karmaLevel(p.karma),
      },
      select: { id: true, username: true },
    });
    userIdByUsername.set(user.username, user.id);
  }
  console.log(`  ✅ ${userIdByUsername.size} users prêts`);

  // 2) Purge des annonces de démo sur les catégories véhicules. On
  //    cible (auteur ∈ personas) ET (catégorie ∈ feuilles véhicules)
  //    pour ne jamais toucher au contenu réel d'un utilisateur.
  const vehicleCats = await prisma.category.findMany({
    where: { slug: { in: VEHICLE_LEAF_SLUGS } },
    select: { id: true, slug: true },
  });
  const catIdBySlug = new Map(vehicleCats.map((c) => [c.slug, c.id]));

  const demoUserIds = Array.from(userIdByUsername.values());
  const toDelete = await prisma.listing.findMany({
    where: {
      authorId: { in: demoUserIds },
      categoryId: { in: vehicleCats.map((c) => c.id) },
    },
    select: { id: true },
  });
  if (toDelete.length > 0) {
    console.log(`🧹 Suppression de ${toDelete.length} annonces demo existantes...`);
    await prisma.listingImage.deleteMany({
      where: { listingId: { in: toDelete.map((l) => l.id) } },
    });
    await prisma.listing.deleteMany({
      where: { id: { in: toDelete.map((l) => l.id) } },
    });
  }

  // 3) Insertion des templates.
  console.log("📦 Création des annonces...");
  let created = 0;
  for (const t of LISTINGS) {
    const categoryId = catIdBySlug.get(t.categoryS);
    if (!categoryId) {
      console.warn(`  ⚠️  skip "${t.title}" — catégorie ${t.categoryS} introuvable`);
      continue;
    }
    const city = await prisma.city.findUnique({ where: { slug: t.citeS } });
    if (!city) {
      console.warn(`  ⚠️  skip "${t.title}" — ville ${t.citeS} introuvable`);
      continue;
    }
    const authorId = userIdByUsername.get(PERSONAS[t.authorIdx].username);
    if (!authorId) continue;

    const slug = `${slugify(t.title) || "annonce"}-${shortId()}`;
    const price = t.price !== null ? new Prisma.Decimal(t.price) : null;

    await prisma.listing.create({
      data: {
        slug,
        title: t.title,
        description: t.description,
        type: t.type,
        priceType: t.priceType,
        price,
        condition: t.condition ?? null,
        attributes: t.attrs as Prisma.InputJsonValue,
        ...denorm(t.attrs),
        neighborhood: t.neighborhood ?? null,
        showPhone: false,
        allowMessages: true,
        status: ListingStatus.PUBLISHED,
        publishedAt: new Date(),
        expiresAt: daysFromNow(30),
        authorId,
        categoryId,
        cityId: city.id,
      },
    });
    created += 1;
  }

  console.log(`  ✅ ${created} annonces véhicules`);
  console.log("✨ Seed véhicules terminé.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
