-- 04_post_import_checks.sql
-- Post-run checks: integrity + SEO critical coverage.

-- ---------------------------------------------------------------------------
-- Quick health summary
-- ---------------------------------------------------------------------------
SELECT
  (SELECT COUNT(*) FROM "cities") AS cities_total,
  (SELECT COUNT(*) FROM "categories" WHERE "type" IN ('DEAL'::"CategoryType", 'BOTH'::"CategoryType") AND "isActive" = true) AS deal_categories_active,
  (SELECT COUNT(*) FROM "categories" WHERE "type" IN ('LISTING'::"CategoryType", 'BOTH'::"CategoryType") AND "isActive" = true) AS listing_categories_active,
  (SELECT COUNT(*) FROM "stores") AS stores_total,
  (SELECT COUNT(*) FROM "deals" WHERE "status" = 'PUBLISHED'::"DealStatus" AND ("expiresAt" IS NULL OR "expiresAt" > NOW())) AS deals_live,
  (SELECT COUNT(*) FROM "listings" WHERE "status" = 'PUBLISHED'::"ListingStatus" AND "expiresAt" > NOW()) AS listings_live;

-- ---------------------------------------------------------------------------
-- SEO pillar prerequisites (cities/categories/stores) must exist
-- ---------------------------------------------------------------------------
SELECT 'missing_city' AS issue_type, slug AS expected_slug
FROM (VALUES
  ('cayenne'),
  ('matoury'),
  ('kourou'),
  ('remire-montjoly'),
  ('saint-laurent-du-maroni')
) AS expected(slug)
WHERE NOT EXISTS (
  SELECT 1 FROM "cities" c WHERE c."slug" = expected.slug
)
UNION ALL
SELECT 'missing_deal_category', slug
FROM (VALUES
  ('supermarche-alimentation'),
  ('tech-multimedia'),
  ('maison-electromenager'),
  ('enfants-bebe')
) AS expected(slug)
WHERE NOT EXISTS (
  SELECT 1 FROM "categories" c
  WHERE c."slug" = expected.slug
    AND c."type" IN ('DEAL'::"CategoryType", 'BOTH'::"CategoryType")
)
UNION ALL
SELECT 'missing_listing_category', slug
FROM (VALUES
  ('voitures'),
  ('motos-scooters'),
  ('immobilier'),
  ('location-appartement'),
  ('emploi-services'),
  ('maison-mobilier'),
  ('multimedia-tech')
) AS expected(slug)
WHERE NOT EXISTS (
  SELECT 1 FROM "categories" c
  WHERE c."slug" = expected.slug
    AND c."type" IN ('LISTING'::"CategoryType", 'BOTH'::"CategoryType")
)
UNION ALL
SELECT 'missing_store', slug
FROM (VALUES
  ('hyper-u-cayenne'),
  ('carrefour-matoury'),
  ('fnac-cayenne'),
  ('darty-matoury')
) AS expected(slug)
WHERE NOT EXISTS (
  SELECT 1 FROM "stores" s WHERE s."slug" = expected.slug
);

-- ---------------------------------------------------------------------------
-- Potentially bad rows that can hurt rendering
-- ---------------------------------------------------------------------------
SELECT
  d."id",
  d."slug",
  d."title",
  d."status",
  d."price",
  d."categoryId",
  d."authorId",
  d."updatedAt"
FROM "deals" d
WHERE
  COALESCE(TRIM(d."slug"), '') = ''
  OR COALESCE(TRIM(d."title"), '') = ''
  OR d."price" < 0
ORDER BY d."updatedAt" DESC
LIMIT 50;

SELECT
  l."id",
  l."slug",
  l."title",
  l."status",
  l."expiresAt",
  l."categoryId",
  l."cityId",
  l."authorId",
  l."updatedAt"
FROM "listings" l
WHERE
  COALESCE(TRIM(l."slug"), '') = ''
  OR COALESCE(TRIM(l."title"), '') = ''
  OR COALESCE(TRIM(l."description"), '') = ''
  OR (l."price" IS NOT NULL AND l."price" < 0)
ORDER BY l."updatedAt" DESC
LIMIT 50;

-- ---------------------------------------------------------------------------
-- Duplicate source URL check (feed quality)
-- ---------------------------------------------------------------------------
SELECT
  d."externalUrl",
  COUNT(*) AS duplicate_count,
  MIN(d."publishedAt") AS first_seen,
  MAX(d."publishedAt") AS last_seen
FROM "deals" d
WHERE d."externalUrl" IS NOT NULL
GROUP BY d."externalUrl"
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, last_seen DESC
LIMIT 100;
