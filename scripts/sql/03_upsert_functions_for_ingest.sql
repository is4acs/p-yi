-- 03_upsert_functions_for_ingest.sql
-- Safe SQL functions for ingestion (deals + listings).

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.peyi_slugify(input_text text)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT
    TRIM(BOTH '-' FROM REGEXP_REPLACE(
      REGEXP_REPLACE(
        LOWER(unaccent(COALESCE(input_text, ''))),
        '[^a-z0-9]+',
        '-',
        'g'
      ),
      '-{2,}',
      '-',
      'g'
    ));
$$;

CREATE OR REPLACE FUNCTION public.peyi_next_slug(p_table regclass, p_base_slug text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_base text;
  v_candidate text;
  v_suffix integer := 0;
  v_exists boolean;
BEGIN
  v_base := COALESCE(NULLIF(TRIM(p_base_slug), ''), 'item');
  v_candidate := LEFT(v_base, 96);

  LOOP
    EXECUTE format('SELECT EXISTS (SELECT 1 FROM %s WHERE "slug" = $1)', p_table)
      INTO v_exists
      USING v_candidate;

    EXIT WHEN NOT v_exists;

    v_suffix := v_suffix + 1;
    v_candidate := LEFT(v_base, 90) || '-' || v_suffix::text;
  END LOOP;

  RETURN v_candidate;
END;
$$;

-- ---------------------------------------------------------------------------
-- Deals ingest upsert
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.peyi_upsert_deal(
  p_author_id text,
  p_title text,
  p_description text DEFAULT NULL,
  p_price numeric DEFAULT 0,
  p_original_price numeric DEFAULT NULL,
  p_currency text DEFAULT 'EUR',
  p_category_slug text DEFAULT NULL,
  p_city_slug text DEFAULT NULL,
  p_store_slug text DEFAULT NULL,
  p_external_url text DEFAULT NULL,
  p_affiliate_url text DEFAULT NULL,
  p_cover_image_url text DEFAULT NULL,
  p_slug text DEFAULT NULL,
  p_published_at timestamptz DEFAULT NOW(),
  p_expires_at timestamptz DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_category_id text;
  v_city_id text;
  v_store_id text;
  v_store_city_id text;

  v_external_url text;
  v_affiliate_url text;
  v_cover_image_url text;

  v_existing_id text;
  v_existing_slug text;

  v_discount integer;
  v_base_slug text;
  v_slug text;
BEGIN
  IF COALESCE(TRIM(p_author_id), '') = '' THEN
    RAISE EXCEPTION 'peyi_upsert_deal: author_id is required';
  END IF;

  IF COALESCE(TRIM(p_title), '') = '' THEN
    RAISE EXCEPTION 'peyi_upsert_deal: title is required';
  END IF;

  IF p_price IS NULL OR p_price < 0 THEN
    RAISE EXCEPTION 'peyi_upsert_deal: price must be >= 0';
  END IF;

  PERFORM 1 FROM "users" WHERE "id" = p_author_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'peyi_upsert_deal: unknown author id %', p_author_id;
  END IF;

  SELECT c."id"
  INTO v_category_id
  FROM "categories" c
  WHERE c."slug" = p_category_slug
    AND c."isActive" = true
    AND c."type" IN ('DEAL'::"CategoryType", 'BOTH'::"CategoryType")
  LIMIT 1;

  IF v_category_id IS NULL THEN
    RAISE EXCEPTION 'peyi_upsert_deal: invalid deal category slug %', p_category_slug;
  END IF;

  IF NULLIF(TRIM(COALESCE(p_city_slug, '')), '') IS NOT NULL THEN
    SELECT "id" INTO v_city_id
    FROM "cities"
    WHERE "slug" = TRIM(p_city_slug)
    LIMIT 1;

    IF v_city_id IS NULL THEN
      RAISE EXCEPTION 'peyi_upsert_deal: unknown city slug %', p_city_slug;
    END IF;
  END IF;

  IF NULLIF(TRIM(COALESCE(p_store_slug, '')), '') IS NOT NULL THEN
    SELECT s."id", s."cityId"
    INTO v_store_id, v_store_city_id
    FROM "stores" s
    WHERE s."slug" = TRIM(p_store_slug)
    LIMIT 1;

    IF v_store_id IS NULL THEN
      RAISE EXCEPTION 'peyi_upsert_deal: unknown store slug %', p_store_slug;
    END IF;

    IF v_city_id IS NULL THEN
      v_city_id := v_store_city_id;
    ELSIF v_store_city_id IS NOT NULL AND v_store_city_id <> v_city_id THEN
      RAISE EXCEPTION 'peyi_upsert_deal: store/city mismatch for store %', p_store_slug;
    END IF;
  END IF;

  v_external_url := NULLIF(TRIM(COALESCE(p_external_url, '')), '');
  v_affiliate_url := NULLIF(TRIM(COALESCE(p_affiliate_url, '')), '');
  v_cover_image_url := NULLIF(TRIM(COALESCE(p_cover_image_url, '')), '');

  IF p_original_price IS NOT NULL
     AND p_original_price > 0
     AND p_original_price > p_price THEN
    v_discount := ROUND(((p_original_price - p_price) / p_original_price) * 100)::int;
  ELSE
    v_discount := NULL;
  END IF;

  IF v_external_url IS NOT NULL THEN
    SELECT d."id", d."slug"
    INTO v_existing_id, v_existing_slug
    FROM "deals" d
    WHERE d."externalUrl" = v_external_url
    ORDER BY d."updatedAt" DESC
    LIMIT 1;
  END IF;

  IF v_existing_id IS NULL AND NULLIF(TRIM(COALESCE(p_slug, '')), '') IS NOT NULL THEN
    SELECT d."id", d."slug"
    INTO v_existing_id, v_existing_slug
    FROM "deals" d
    WHERE d."slug" = TRIM(p_slug)
    LIMIT 1;
  END IF;

  IF v_existing_id IS NOT NULL THEN
    UPDATE "deals"
    SET
      "title" = TRIM(p_title),
      "description" = NULLIF(TRIM(COALESCE(p_description, '')), ''),
      "price" = p_price,
      "originalPrice" = p_original_price,
      "discountPercent" = v_discount,
      "currency" = COALESCE(NULLIF(TRIM(COALESCE(p_currency, '')), ''), 'EUR'),
      "isFree" = CASE WHEN p_price = 0 THEN true ELSE false END,
      "categoryId" = v_category_id,
      "cityId" = v_city_id,
      "storeId" = v_store_id,
      "externalUrl" = v_external_url,
      "affiliateUrl" = v_affiliate_url,
      "coverImageUrl" = v_cover_image_url,
      "publishedAt" = COALESCE(p_published_at, "publishedAt"),
      "expiresAt" = p_expires_at,
      "status" = 'PUBLISHED'::"DealStatus",
      "updatedAt" = NOW()
    WHERE "id" = v_existing_id;

    RETURN v_existing_slug;
  END IF;

  v_base_slug := COALESCE(
    NULLIF(TRIM(p_slug), ''),
    public.peyi_slugify(TRIM(p_title))
  );

  IF COALESCE(v_base_slug, '') = '' THEN
    v_base_slug := 'bon-plan';
  END IF;

  v_slug := public.peyi_next_slug('deals'::regclass, v_base_slug);

  INSERT INTO "deals" (
    "id",
    "authorId",
    "title",
    "slug",
    "description",
    "price",
    "originalPrice",
    "discountPercent",
    "currency",
    "isFree",
    "cityId",
    "storeId",
    "categoryId",
    "externalUrl",
    "affiliateUrl",
    "coverImageUrl",
    "status",
    "updatedAt",
    "publishedAt",
    "expiresAt"
  )
  VALUES (
    gen_random_uuid()::text,
    p_author_id,
    TRIM(p_title),
    v_slug,
    NULLIF(TRIM(COALESCE(p_description, '')), ''),
    p_price,
    p_original_price,
    v_discount,
    COALESCE(NULLIF(TRIM(COALESCE(p_currency, '')), ''), 'EUR'),
    CASE WHEN p_price = 0 THEN true ELSE false END,
    v_city_id,
    v_store_id,
    v_category_id,
    v_external_url,
    v_affiliate_url,
    v_cover_image_url,
    'PUBLISHED'::"DealStatus",
    NOW(),
    COALESCE(p_published_at, NOW()),
    p_expires_at
  );

  RETURN v_slug;
END;
$$;

-- ---------------------------------------------------------------------------
-- Listings ingest upsert
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.peyi_upsert_listing(
  p_author_id text,
  p_title text,
  p_description text,
  p_category_slug text,
  p_city_slug text,
  p_price numeric DEFAULT NULL,
  p_price_type "PriceType" DEFAULT 'FIXED'::"PriceType",
  p_listing_type "ListingType" DEFAULT 'OFFER'::"ListingType",
  p_condition "ItemCondition" DEFAULT NULL,
  p_currency text DEFAULT 'EUR',
  p_neighborhood text DEFAULT NULL,
  p_attributes jsonb DEFAULT '{}'::jsonb,
  p_contact_phone text DEFAULT NULL,
  p_show_phone boolean DEFAULT false,
  p_allow_messages boolean DEFAULT true,
  p_cover_image_url text DEFAULT NULL,
  p_slug text DEFAULT NULL,
  p_published_at timestamptz DEFAULT NOW(),
  p_expires_at timestamptz DEFAULT (NOW() + INTERVAL '30 days')
)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_category_id text;
  v_city_id text;

  v_cover_image_url text;
  v_neighborhood text;
  v_contact_phone text;

  v_existing_id text;
  v_existing_slug text;

  v_base_slug text;
  v_slug text;
BEGIN
  IF COALESCE(TRIM(p_author_id), '') = '' THEN
    RAISE EXCEPTION 'peyi_upsert_listing: author_id is required';
  END IF;

  IF COALESCE(TRIM(p_title), '') = '' THEN
    RAISE EXCEPTION 'peyi_upsert_listing: title is required';
  END IF;

  IF COALESCE(TRIM(p_description), '') = '' THEN
    RAISE EXCEPTION 'peyi_upsert_listing: description is required';
  END IF;

  IF COALESCE(TRIM(p_city_slug), '') = '' THEN
    RAISE EXCEPTION 'peyi_upsert_listing: city slug is required';
  END IF;

  IF p_price IS NOT NULL AND p_price < 0 THEN
    RAISE EXCEPTION 'peyi_upsert_listing: price must be >= 0 when provided';
  END IF;

  IF p_expires_at <= COALESCE(p_published_at, NOW()) THEN
    RAISE EXCEPTION 'peyi_upsert_listing: expires_at must be after published_at';
  END IF;

  PERFORM 1 FROM "users" WHERE "id" = p_author_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'peyi_upsert_listing: unknown author id %', p_author_id;
  END IF;

  SELECT c."id"
  INTO v_category_id
  FROM "categories" c
  WHERE c."slug" = p_category_slug
    AND c."isActive" = true
    AND c."type" IN ('LISTING'::"CategoryType", 'BOTH'::"CategoryType")
  LIMIT 1;

  IF v_category_id IS NULL THEN
    RAISE EXCEPTION 'peyi_upsert_listing: invalid listing category slug %', p_category_slug;
  END IF;

  SELECT "id"
  INTO v_city_id
  FROM "cities"
  WHERE "slug" = TRIM(p_city_slug)
  LIMIT 1;

  IF v_city_id IS NULL THEN
    RAISE EXCEPTION 'peyi_upsert_listing: unknown city slug %', p_city_slug;
  END IF;

  v_cover_image_url := NULLIF(TRIM(COALESCE(p_cover_image_url, '')), '');
  v_neighborhood := NULLIF(TRIM(COALESCE(p_neighborhood, '')), '');
  v_contact_phone := NULLIF(TRIM(COALESCE(p_contact_phone, '')), '');

  IF NULLIF(TRIM(COALESCE(p_slug, '')), '') IS NOT NULL THEN
    SELECT l."id", l."slug"
    INTO v_existing_id, v_existing_slug
    FROM "listings" l
    WHERE l."slug" = TRIM(p_slug)
    LIMIT 1;
  END IF;

  IF v_existing_id IS NOT NULL THEN
    UPDATE "listings"
    SET
      "title" = TRIM(p_title),
      "description" = TRIM(p_description),
      "price" = p_price,
      "priceType" = COALESCE(p_price_type, 'FIXED'::"PriceType"),
      "currency" = COALESCE(NULLIF(TRIM(COALESCE(p_currency, '')), ''), 'EUR'),
      "type" = COALESCE(p_listing_type, 'OFFER'::"ListingType"),
      "condition" = p_condition,
      "cityId" = v_city_id,
      "neighborhood" = v_neighborhood,
      "categoryId" = v_category_id,
      "attributes" = COALESCE(p_attributes, '{}'::jsonb),
      "coverImageUrl" = v_cover_image_url,
      "contactPhone" = v_contact_phone,
      "showPhone" = COALESCE(p_show_phone, false),
      "allowMessages" = COALESCE(p_allow_messages, true),
      "status" = 'PUBLISHED'::"ListingStatus",
      "publishedAt" = COALESCE(p_published_at, "publishedAt"),
      "expiresAt" = p_expires_at,
      "updatedAt" = NOW()
    WHERE "id" = v_existing_id;

    RETURN v_existing_slug;
  END IF;

  v_base_slug := COALESCE(
    NULLIF(TRIM(p_slug), ''),
    public.peyi_slugify(TRIM(p_title))
  );

  IF COALESCE(v_base_slug, '') = '' THEN
    v_base_slug := 'annonce';
  END IF;

  v_slug := public.peyi_next_slug('listings'::regclass, v_base_slug);

  INSERT INTO "listings" (
    "id",
    "authorId",
    "title",
    "slug",
    "description",
    "price",
    "priceType",
    "currency",
    "type",
    "condition",
    "cityId",
    "neighborhood",
    "categoryId",
    "attributes",
    "coverImageUrl",
    "contactPhone",
    "showPhone",
    "allowMessages",
    "status",
    "expiresAt",
    "updatedAt",
    "publishedAt"
  )
  VALUES (
    gen_random_uuid()::text,
    p_author_id,
    TRIM(p_title),
    v_slug,
    TRIM(p_description),
    p_price,
    COALESCE(p_price_type, 'FIXED'::"PriceType"),
    COALESCE(NULLIF(TRIM(COALESCE(p_currency, '')), ''), 'EUR'),
    COALESCE(p_listing_type, 'OFFER'::"ListingType"),
    p_condition,
    v_city_id,
    v_neighborhood,
    v_category_id,
    COALESCE(p_attributes, '{}'::jsonb),
    v_cover_image_url,
    v_contact_phone,
    COALESCE(p_show_phone, false),
    COALESCE(p_allow_messages, true),
    'PUBLISHED'::"ListingStatus",
    p_expires_at,
    NOW(),
    COALESCE(p_published_at, NOW())
  );

  RETURN v_slug;
END;
$$;
