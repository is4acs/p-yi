// =============================================================================
// PÉYI — Backfill des colonnes `attr*` indexées sur `Listing`
// =============================================================================
// Les colonnes natives `attrYear`, `attrMileageKm`, etc. sont un cache
// dérivé de `Listing.attributes` (JSON). Après la migration S18 qui a créé
// les colonnes, il faut reparcourir chaque annonce existante et
// reprojeter ses attributs vers les colonnes dédiées.
//
// Idempotent : exécuter deux fois donne le même résultat. Sûr à relancer
// après chaque nouvel ajout de colonne dénormalisée.
//
// Usage :
//   npx tsx scripts/backfill-listing-attrs.ts
// =============================================================================

import { PrismaClient, Prisma } from "@prisma/client";

import {
  denormalizeAttributes,
  pickRegisteredAttributes,
} from "../src/lib/listings/field-registry";

const prisma = new PrismaClient();

/**
 * Taille du batch. 500 est un compromis : assez petit pour ne pas tenir
 * toute la table en mémoire, assez grand pour amortir le round-trip DB.
 */
const BATCH_SIZE = 500;

type Row = {
  id: string;
  attributes: Prisma.JsonValue;
  category: { slug: string };
};

async function main() {
  console.log("🔄 Backfill des colonnes attr* depuis Listing.attributes…");

  const total = await prisma.listing.count();
  console.log(`   ${total} annonces à examiner.`);

  let cursor: string | null = null;
  let processed = 0;
  let updated = 0;
  let skipped = 0;

  while (true) {
    const rows: Row[] = await prisma.listing.findMany({
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: "asc" },
      select: {
        id: true,
        attributes: true,
        category: { select: { slug: true } },
      },
    });
    if (rows.length === 0) break;

    for (const row of rows) {
      processed += 1;

      // On passe par `pickRegisteredAttributes` : si la catégorie a changé
      // depuis la création et que l'annonce contient des clés d'une ancienne
      // catégorie, on ne les projette PAS vers les colonnes natives. La
      // cohérence vignette / filtres reste propre.
      const picked = pickRegisteredAttributes(
        row.category.slug,
        row.attributes,
      );
      const denorm = denormalizeAttributes(picked);

      try {
        await prisma.listing.update({
          where: { id: row.id },
          data: denorm,
        });
        updated += 1;
      } catch (err) {
        skipped += 1;
        console.warn(
          `   ⚠️  ${row.id} : update ignoré — ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }

    cursor = rows[rows.length - 1].id;
    console.log(`   … ${processed}/${total} traitées.`);
  }

  console.log(
    `✅ Terminé : ${updated} mises à jour, ${skipped} ignorées sur ${processed} examinées.`,
  );
}

main()
  .catch((err) => {
    console.error("❌ Backfill en échec :", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
