-- 01_seed_reference_marketplace.sql
-- Reference seed required by SEO pillars and marketplace pages.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

BEGIN;

-- ---------------------------------------------------------------------------
-- Core cities (SEO + routing)
-- ---------------------------------------------------------------------------
INSERT INTO "cities" ("id", "name", "slug", "postcode", "latitude", "longitude")
VALUES
  (gen_random_uuid()::text, 'Cayenne', 'cayenne', '97300', 4.9227, -52.3269),
  (gen_random_uuid()::text, 'Matoury', 'matoury', '97351', 4.8513, -52.3275),
  (gen_random_uuid()::text, 'Kourou', 'kourou', '97310', 5.1595, -52.6503),
  (gen_random_uuid()::text, 'Remire-Montjoly', 'remire-montjoly', '97354', 4.8951, -52.2713),
  (gen_random_uuid()::text, 'Saint-Laurent-du-Maroni', 'saint-laurent-du-maroni', '97320', 5.5018, -54.0280)
ON CONFLICT ("slug") DO UPDATE
SET
  "name" = EXCLUDED."name",
  "postcode" = EXCLUDED."postcode",
  "latitude" = EXCLUDED."latitude",
  "longitude" = EXCLUDED."longitude";

-- ---------------------------------------------------------------------------
-- Deal categories needed by SEO pages
-- ---------------------------------------------------------------------------
INSERT INTO "categories" (
  "id", "name", "slug", "icon", "color", "type", "sortOrder", "isActive"
)
VALUES
  (gen_random_uuid()::text, 'Supermarche & Alimentation', 'supermarche-alimentation', '🛒', '#FF6B35', 'DEAL'::"CategoryType", 1, true),
  (gen_random_uuid()::text, 'Tech & Multimedia', 'tech-multimedia', '📱', '#3B82F6', 'DEAL'::"CategoryType", 2, true),
  (gen_random_uuid()::text, 'Maison & Electromenager', 'maison-electromenager', '🏠', '#8B5CF6', 'DEAL'::"CategoryType", 4, true),
  (gen_random_uuid()::text, 'Enfants & Bebe', 'enfants-bebe', '👶', '#84CC16', 'DEAL'::"CategoryType", 8, true)
ON CONFLICT ("slug") DO UPDATE
SET
  "name" = EXCLUDED."name",
  "icon" = EXCLUDED."icon",
  "color" = EXCLUDED."color",
  "type" = EXCLUDED."type",
  "sortOrder" = EXCLUDED."sortOrder",
  "isActive" = true;

-- ---------------------------------------------------------------------------
-- Listing parent categories (root)
-- ---------------------------------------------------------------------------
INSERT INTO "categories" (
  "id", "name", "slug", "icon", "color", "type", "sortOrder", "isActive"
)
VALUES
  (gen_random_uuid()::text, 'Vehicules', 'vehicules', '🚗', '#EF4444', 'LISTING'::"CategoryType", 1, true),
  (gen_random_uuid()::text, 'Immobilier', 'immobilier', '🏠', '#8B5CF6', 'LISTING'::"CategoryType", 2, true),
  (gen_random_uuid()::text, 'Emploi & Services', 'emploi-services', '💼', '#1E40AF', 'LISTING'::"CategoryType", 3, true),
  (gen_random_uuid()::text, 'Multimedia & Tech', 'multimedia-tech', '📱', '#3B82F6', 'LISTING'::"CategoryType", 4, true),
  (gen_random_uuid()::text, 'Maison & Mobilier', 'maison-mobilier', '🛋️', '#A16207', 'LISTING'::"CategoryType", 5, true)
ON CONFLICT ("slug") DO UPDATE
SET
  "name" = EXCLUDED."name",
  "icon" = EXCLUDED."icon",
  "color" = EXCLUDED."color",
  "type" = EXCLUDED."type",
  "sortOrder" = EXCLUDED."sortOrder",
  "isActive" = true;

-- ---------------------------------------------------------------------------
-- Listing leaf categories (for SEO category pillars)
-- ---------------------------------------------------------------------------
WITH root_categories AS (
  SELECT
    MAX(CASE WHEN "slug" = 'vehicules' THEN "id" END) AS vehicules_id,
    MAX(CASE WHEN "slug" = 'immobilier' THEN "id" END) AS immobilier_id
  FROM "categories"
), leaf_categories AS (
  SELECT
    gen_random_uuid()::text AS id,
    v.name,
    v.slug,
    v.icon,
    v.color,
    v.parent_slug,
    v.sort_order
  FROM (
    VALUES
      ('Voitures', 'voitures', '🚗', '#EF4444', 'vehicules', 11),
      ('Motos & Scooters', 'motos-scooters', '🏍️', '#16A34A', 'vehicules', 12),
      ('Location - Appartement', 'location-appartement', '🏢', '#B45309', 'immobilier', 21)
  ) AS v(name, slug, icon, color, parent_slug, sort_order)
), leaf_with_parent AS (
  SELECT
    l.id,
    l.name,
    l.slug,
    l.icon,
    l.color,
    CASE
      WHEN l.parent_slug = 'vehicules' THEN r.vehicules_id
      WHEN l.parent_slug = 'immobilier' THEN r.immobilier_id
      ELSE NULL
    END AS parent_id,
    l.sort_order
  FROM leaf_categories l
  CROSS JOIN root_categories r
)
INSERT INTO "categories" (
  "id", "name", "slug", "icon", "color", "type", "parentId", "sortOrder", "isActive"
)
SELECT
  id,
  name,
  slug,
  icon,
  color,
  'LISTING'::"CategoryType",
  parent_id,
  sort_order,
  true
FROM leaf_with_parent
WHERE parent_id IS NOT NULL
ON CONFLICT ("slug") DO UPDATE
SET
  "name" = EXCLUDED."name",
  "icon" = EXCLUDED."icon",
  "color" = EXCLUDED."color",
  "type" = EXCLUDED."type",
  "parentId" = EXCLUDED."parentId",
  "sortOrder" = EXCLUDED."sortOrder",
  "isActive" = true;

-- ---------------------------------------------------------------------------
-- Stores required by SEO pillar pages
-- ---------------------------------------------------------------------------
WITH city_map AS (
  SELECT "id", "slug"
  FROM "cities"
  WHERE "slug" IN ('cayenne', 'matoury')
), store_rows AS (
  SELECT
    gen_random_uuid()::text AS id,
    v.name,
    v.slug,
    v.city_slug,
    v.website,
    v.is_verified
  FROM (
    VALUES
      ('Hyper U Cayenne', 'hyper-u-cayenne', 'cayenne', NULL::text, true),
      ('Carrefour Matoury', 'carrefour-matoury', 'matoury', NULL::text, true),
      ('Fnac Cayenne', 'fnac-cayenne', 'cayenne', NULL::text, true),
      ('Darty Matoury', 'darty-matoury', 'matoury', NULL::text, true)
  ) AS v(name, slug, city_slug, website, is_verified)
)
INSERT INTO "stores" (
  "id", "name", "slug", "cityId", "website", "isVerified", "updatedAt"
)
SELECT
  s.id,
  s.name,
  s.slug,
  c."id",
  s.website,
  s.is_verified,
  NOW()
FROM store_rows s
JOIN city_map c
  ON c."slug" = s.city_slug
ON CONFLICT ("slug") DO UPDATE
SET
  "name" = EXCLUDED."name",
  "cityId" = EXCLUDED."cityId",
  "website" = EXCLUDED."website",
  "isVerified" = EXCLUDED."isVerified",
  "updatedAt" = NOW();

COMMIT;
