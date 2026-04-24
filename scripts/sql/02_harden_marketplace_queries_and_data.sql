-- 02_harden_marketplace_queries_and_data.sql
-- Data cleanup + performance hardening for deals/listings routes.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------------------
-- Clean obvious bad values that often break rendering / image handling
-- ---------------------------------------------------------------------------
UPDATE "deals"
SET
  "title" = TRIM("title"),
  "coverImageUrl" = NULLIF(TRIM(COALESCE("coverImageUrl", '')), ''),
  "externalUrl" = NULLIF(TRIM(COALESCE("externalUrl", '')), ''),
  "affiliateUrl" = NULLIF(TRIM(COALESCE("affiliateUrl", '')), ''),
  "updatedAt" = NOW()
WHERE
  "title" <> TRIM("title")
  OR COALESCE("coverImageUrl", '') <> COALESCE(NULLIF(TRIM(COALESCE("coverImageUrl", '')), ''), '')
  OR COALESCE("externalUrl", '') <> COALESCE(NULLIF(TRIM(COALESCE("externalUrl", '')), ''), '')
  OR COALESCE("affiliateUrl", '') <> COALESCE(NULLIF(TRIM(COALESCE("affiliateUrl", '')), ''), '');

UPDATE "listings"
SET
  "title" = TRIM("title"),
  "description" = TRIM("description"),
  "coverImageUrl" = NULLIF(TRIM(COALESCE("coverImageUrl", '')), ''),
  "neighborhood" = NULLIF(TRIM(COALESCE("neighborhood", '')), ''),
  "contactPhone" = NULLIF(TRIM(COALESCE("contactPhone", '')), ''),
  "attributes" = COALESCE("attributes", '{}'::jsonb),
  "updatedAt" = NOW()
WHERE
  "title" <> TRIM("title")
  OR "description" <> TRIM("description")
  OR COALESCE("coverImageUrl", '') <> COALESCE(NULLIF(TRIM(COALESCE("coverImageUrl", '')), ''), '')
  OR COALESCE("neighborhood", '') <> COALESCE(NULLIF(TRIM(COALESCE("neighborhood", '')), ''), '')
  OR COALESCE("contactPhone", '') <> COALESCE(NULLIF(TRIM(COALESCE("contactPhone", '')), ''), '')
  OR "attributes" IS NULL;

UPDATE "deal_images"
SET "url" = TRIM("url")
WHERE "url" <> TRIM("url");

DELETE FROM "deal_images"
WHERE TRIM(COALESCE("url", '')) = '';

UPDATE "listing_images"
SET "url" = TRIM("url")
WHERE "url" <> TRIM("url");

DELETE FROM "listing_images"
WHERE TRIM(COALESCE("url", '')) = '';

-- ---------------------------------------------------------------------------
-- Keep statuses coherent with expiration to avoid stale payload noise
-- ---------------------------------------------------------------------------
UPDATE "deals"
SET
  "status" = 'EXPIRED'::"DealStatus",
  "updatedAt" = NOW()
WHERE
  "status" = 'PUBLISHED'::"DealStatus"
  AND "expiresAt" IS NOT NULL
  AND "expiresAt" <= NOW();

UPDATE "listings"
SET
  "status" = 'EXPIRED'::"ListingStatus",
  "updatedAt" = NOW()
WHERE
  "status" = 'PUBLISHED'::"ListingStatus"
  AND "expiresAt" <= NOW();

-- ---------------------------------------------------------------------------
-- Recompute deal pricing denormalization safely
-- ---------------------------------------------------------------------------
UPDATE "deals"
SET
  "discountPercent" = CASE
    WHEN "originalPrice" IS NOT NULL
      AND "originalPrice" > 0
      AND "price" >= 0
      AND "originalPrice" > "price"
      THEN ROUND((("originalPrice" - "price") / "originalPrice") * 100)::int
    ELSE NULL
  END,
  "isFree" = CASE WHEN "price" = 0 THEN true ELSE false END,
  "updatedAt" = NOW();

-- ---------------------------------------------------------------------------
-- Extra indexes for heavy filters/search used by bons-plans & annonces pages
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS "deals_live_status_pub_exp_idx"
  ON "deals" ("status", "publishedAt" DESC, "expiresAt");

CREATE INDEX IF NOT EXISTS "deals_live_city_category_pub_idx"
  ON "deals" ("status", "cityId", "categoryId", "publishedAt" DESC);

CREATE INDEX IF NOT EXISTS "deals_external_url_idx"
  ON "deals" ("externalUrl")
  WHERE "externalUrl" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "deals_search_trgm_idx"
  ON "deals"
  USING GIN ((COALESCE("title", '') || ' ' || COALESCE("description", '')) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "listings_live_status_pub_exp_idx"
  ON "listings" ("status", "publishedAt" DESC, "expiresAt");

CREATE INDEX IF NOT EXISTS "listings_live_city_category_pub_idx"
  ON "listings" ("status", "cityId", "categoryId", "publishedAt" DESC);

CREATE INDEX IF NOT EXISTS "listings_live_sort_price_idx"
  ON "listings" ("status", "isBoosted", "isUrgent", "price", "publishedAt" DESC);

CREATE INDEX IF NOT EXISTS "listings_search_trgm_idx"
  ON "listings"
  USING GIN ((COALESCE("title", '') || ' ' || COALESCE("description", '')) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "deal_images_deal_sort_idx"
  ON "deal_images" ("dealId", "sortOrder");

CREATE INDEX IF NOT EXISTS "listing_images_listing_sort_idx"
  ON "listing_images" ("listingId", "sortOrder");
