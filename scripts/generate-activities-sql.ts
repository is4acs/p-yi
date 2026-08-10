// =============================================================================
// PÉYI — Génération du SQL des activités pour l'éditeur Supabase
// =============================================================================
// Usage : npm run sql:activites  → écrit supabase/activites.sql
//
// Produit un script SQL autonome, idempotent et rejouable, à coller dans
// l'éditeur SQL de Supabase quand on ne veut (ou ne peut) pas faire tourner
// le CLI Prisma en local. Il contient trois blocs :
//
//   1. le DDL des deux migrations Prisma de la verticale activités ;
//   2. les données (communes + activités) issues de `prisma/data/activities.ts`,
//      donc strictement identiques à celles du seed TypeScript ;
//   3. l'enregistrement des deux migrations dans `_prisma_migrations`, avec
//      leur checksum réel — sans quoi le `prisma migrate deploy` du prochain
//      `npm run build` tenterait de les rejouer et échouerait.
//
// Le SQL généré est volontairement défensif (IF NOT EXISTS, ON CONFLICT) :
// on peut le rejouer sans casser une base déjà partiellement à jour.
// =============================================================================

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { ACTIVITIES, CITIES } from "../prisma/data/activities";

const ROOT = join(__dirname, "..");
const MIGRATIONS = [
  "20260810000000_add_activities",
  "20260810120000_admin_activity_audit",
];

// --- Helpers de littéraux SQL ------------------------------------------------

/** Chaîne SQL avec échappement des quotes simples. */
function s(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function sOrNull(value: string | null | undefined): string {
  return value === null || value === undefined ? "NULL" : s(value);
}

function nOrNull(value: number | null | undefined): string {
  return value === null || value === undefined ? "NULL" : String(value);
}

/** Tableau Postgres typé : ARRAY['A','B']::"Enum"[] — ARRAY[]::T[] si vide. */
function arr(values: readonly string[], type: string): string {
  if (values.length === 0) return `ARRAY[]::${type}[]`;
  return `ARRAY[${values.map(s).join(", ")}]::${type}[]`;
}

function jsonOrNull(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  return `${s(JSON.stringify(value))}::jsonb`;
}

// --- Construction du script --------------------------------------------------

const parts: string[] = [];

parts.push(`-- =============================================================================
-- PÉYI — Verticale « activités » : schéma + ${ACTIVITIES.length} activités
-- =============================================================================
-- Généré par \`npm run sql:activites\` — NE PAS ÉDITER À LA MAIN.
-- Source des données : prisma/data/activities.ts
--
-- À coller tel quel dans l'éditeur SQL de Supabase (SQL Editor → New query),
-- puis « Run ». Le script est idempotent : le rejouer ne casse rien et met
-- simplement les fiches à jour.
--
-- Il enregistre aussi les deux migrations dans _prisma_migrations, pour que
-- le \`prisma migrate deploy\` du prochain \`npm run build\` les considère comme
-- déjà appliquées au lieu d'essayer de les rejouer.
-- =============================================================================

BEGIN;
`);

// 1. DDL des migrations, rendu ré-exécutable.
for (const name of MIGRATIONS) {
  const file = join(ROOT, "prisma", "migrations", name, "migration.sql");
  const sql = readFileSync(file, "utf8");

  parts.push(`
-- -----------------------------------------------------------------------------
-- Migration ${name}
-- -----------------------------------------------------------------------------`);

  for (const raw of sql.split(/;\s*\n/)) {
    // Chaque instruction Prisma est précédée de son commentaire
    // (`-- CreateTable`, `-- AlterEnum`…). On retire les lignes de
    // commentaire plutôt que d'ignorer le bloc, sinon on perd le DDL.
    const stmt = raw
      .split("\n")
      .filter((line) => !line.trim().startsWith("--"))
      .join("\n")
      .trim();
    if (!stmt) continue;

    // Les migrations Prisma ne sont pas idempotentes : on les rend rejouables.
    let out = stmt
      .replace(/^CREATE TABLE /m, "CREATE TABLE IF NOT EXISTS ")
      .replace(/^CREATE INDEX /m, "CREATE INDEX IF NOT EXISTS ")
      .replace(/^CREATE UNIQUE INDEX /m, "CREATE UNIQUE INDEX IF NOT EXISTS ");

    if (/^CREATE TYPE /m.test(out)) {
      // Pas de IF NOT EXISTS sur CREATE TYPE : on encapsule.
      const typeName = /CREATE TYPE "([^"]+)"/.exec(out)?.[1] ?? "";
      parts.push(`DO $$ BEGIN
  ${out.replace(/\n/g, "\n  ")};
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'type ${typeName} déjà présent, ignoré';
END $$;`);
      continue;
    }

    if (/^ALTER TYPE .* ADD VALUE /m.test(out)) {
      // ADD VALUE ne supporte IF NOT EXISTS qu'à partir de PG 12 ; Supabase
      // est bien au-delà, et c'est la seule forme rejouable.
      parts.push(`${out.replace(/ADD VALUE /, "ADD VALUE IF NOT EXISTS ")};`);
      continue;
    }

    if (/^ALTER TABLE .* ADD CONSTRAINT /m.test(out)) {
      const constraint = /ADD CONSTRAINT "([^"]+)"/.exec(out)?.[1] ?? "";
      parts.push(`DO $$ BEGIN
  ${out.replace(/\n/g, "\n  ")};
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'contrainte ${constraint} déjà présente, ignorée';
END $$;`);
      continue;
    }

    parts.push(`${out};`);
  }
}

// 2. Données — communes puis activités.
parts.push(`

-- -----------------------------------------------------------------------------
-- Communes référencées par les activités (créées si absentes)
-- -----------------------------------------------------------------------------`);

for (const city of CITIES) {
  parts.push(
    `INSERT INTO "cities" ("id", "name", "slug", "postcode", "latitude", "longitude")
VALUES (gen_random_uuid()::text, ${s(city.name)}, ${s(city.slug)}, ${s(city.postcode)}, ${city.latitude}, ${city.longitude})
ON CONFLICT ("slug") DO NOTHING;`,
  );
}

parts.push(`

-- -----------------------------------------------------------------------------
-- Activités (${ACTIVITIES.length}) — publiées, rattachées à leur commune par slug
-- -----------------------------------------------------------------------------`);

for (const a of ACTIVITIES) {
  parts.push(
    `INSERT INTO "activities" (
  "id", "slug", "name", "tagline", "description", "category", "tags",
  "latitude", "longitude", "cityId", "address", "startPoint",
  "accessModes", "durationMinutes", "difficulty", "seasons", "accessNote",
  "priceMinCents", "priceMaxCents", "isFree", "bookingRequired", "bookingUrl",
  "phone", "whatsapp", "website", "instagram", "openingHours",
  "status", "isFeatured", "viewCount", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text, ${s(a.slug)}, ${s(a.name)}, ${s(a.tagline)},
  ${s(a.description)}, ${s(a.category)}::"ActivityCategory", ${arr(a.tags, "TEXT")},
  ${a.latitude}, ${a.longitude}, c."id", ${sOrNull(a.address)}, ${sOrNull(a.startPoint)},
  ${arr(a.accessModes, '"AccessMode"')}, ${nOrNull(a.durationMinutes)},
  ${a.difficulty ? `${s(a.difficulty)}::"Difficulty"` : "NULL"},
  ${arr(a.seasons, '"Season"')}, ${sOrNull(a.accessNote)},
  ${nOrNull(a.priceMinCents)}, ${nOrNull(a.priceMaxCents)},
  ${a.isFree ?? false}, ${a.bookingRequired ?? false}, ${sOrNull(a.bookingUrl)},
  ${sOrNull(a.phone)}, ${sOrNull(a.whatsapp)}, ${sOrNull(a.website)}, ${sOrNull(a.instagram)},
  ${jsonOrNull(a.openingHours)},
  'PUBLISHED'::"ActivityStatus", false, 0, NOW(), NOW()
FROM "cities" c WHERE c."slug" = ${s(a.citySlug)}
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "tagline" = EXCLUDED."tagline",
  "description" = EXCLUDED."description",
  "category" = EXCLUDED."category",
  "tags" = EXCLUDED."tags",
  "latitude" = EXCLUDED."latitude",
  "longitude" = EXCLUDED."longitude",
  "cityId" = EXCLUDED."cityId",
  "address" = EXCLUDED."address",
  "startPoint" = EXCLUDED."startPoint",
  "accessModes" = EXCLUDED."accessModes",
  "durationMinutes" = EXCLUDED."durationMinutes",
  "difficulty" = EXCLUDED."difficulty",
  "seasons" = EXCLUDED."seasons",
  "accessNote" = EXCLUDED."accessNote",
  "priceMinCents" = EXCLUDED."priceMinCents",
  "priceMaxCents" = EXCLUDED."priceMaxCents",
  "isFree" = EXCLUDED."isFree",
  "bookingRequired" = EXCLUDED."bookingRequired",
  "bookingUrl" = EXCLUDED."bookingUrl",
  "phone" = EXCLUDED."phone",
  "whatsapp" = EXCLUDED."whatsapp",
  "website" = EXCLUDED."website",
  "instagram" = EXCLUDED."instagram",
  "openingHours" = EXCLUDED."openingHours",
  "status" = EXCLUDED."status",
  "updatedAt" = NOW();`,
  );
}

// 3. Enregistrement des migrations côté Prisma.
parts.push(`

-- -----------------------------------------------------------------------------
-- Marque les deux migrations comme appliquées (checksums réels des fichiers)
-- Sans ça, le \`prisma migrate deploy\` du prochain build tenterait de les
-- rejouer et planterait sur « type already exists ».
-- -----------------------------------------------------------------------------`);

for (const name of MIGRATIONS) {
  const file = join(ROOT, "prisma", "migrations", name, "migration.sql");
  const checksum = createHash("sha256")
    .update(readFileSync(file))
    .digest("hex");

  parts.push(
    `INSERT INTO "_prisma_migrations" (
  "id", "checksum", "finished_at", "migration_name", "logs",
  "rolled_back_at", "started_at", "applied_steps_count"
)
VALUES (
  gen_random_uuid()::text, ${s(checksum)}, NOW(), ${s(name)}, NULL,
  NULL, NOW(), 1
)
ON CONFLICT ("id") DO NOTHING;`,
  );
}

parts.push(`
COMMIT;

-- -----------------------------------------------------------------------------
-- Vérification (à lancer après le COMMIT)
-- -----------------------------------------------------------------------------
-- SELECT count(*) AS activites FROM "activities" WHERE "status" = 'PUBLISHED';
-- SELECT c."name" AS commune, count(*) FROM "activities" a
--   JOIN "cities" c ON c."id" = a."cityId" GROUP BY 1 ORDER BY 2 DESC;
`);

const target = join(ROOT, "supabase", "activites.sql");
writeFileSync(target, parts.join("\n") + "\n");

console.log(
  `✅ ${target} généré — ${CITIES.length} communes, ${ACTIVITIES.length} activités, ${MIGRATIONS.length} migrations`,
);
