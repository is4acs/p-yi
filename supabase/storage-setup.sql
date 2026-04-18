-- ============================================================================
-- Péyi — Supabase Storage setup
-- Copy-paste into Supabase Dashboard → SQL Editor and run once.
-- ============================================================================

-- 1) Bucket "deals" (public read, 5 MB limit, images only)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'deals',
  'deals',
  true,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public           = EXCLUDED.public,
    file_size_limit  = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2) Policies
DROP POLICY IF EXISTS "deals_insert_own_folder" ON storage.objects;
DROP POLICY IF EXISTS "deals_select_public"     ON storage.objects;
DROP POLICY IF EXISTS "deals_delete_own"        ON storage.objects;
DROP POLICY IF EXISTS "deals_update_own"        ON storage.objects;

-- Authenticated users can upload only inside a folder named after their UID.
-- Path convention: deals/<uid>/<random>.<ext>
CREATE POLICY "deals_insert_own_folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'deals'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Anyone (including anon) can read — the bucket powers the public deal feed.
CREATE POLICY "deals_select_public"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'deals');

-- Owners can delete their own images.
CREATE POLICY "deals_delete_own"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'deals'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Owners can replace their own images.
CREATE POLICY "deals_update_own"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'deals'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================================
-- 3) Bucket "avatars" (public read, 2 MB limit, images only)
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152, -- 2 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public           = EXCLUDED.public,
    file_size_limit  = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "avatars_insert_own_folder" ON storage.objects;
DROP POLICY IF EXISTS "avatars_select_public"     ON storage.objects;
DROP POLICY IF EXISTS "avatars_delete_own"        ON storage.objects;
DROP POLICY IF EXISTS "avatars_update_own"        ON storage.objects;

-- Path convention: avatars/<uid>/<random>.<ext>
CREATE POLICY "avatars_insert_own_folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Public read — avatars are shown next to every post/comment.
CREATE POLICY "avatars_select_public"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

CREATE POLICY "avatars_delete_own"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "avatars_update_own"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================================
-- 4) Bucket "listings" (public read, 5 MB limit, images only)
-- Ce bucket était référencé par src/lib/storage/listing-images.ts mais jamais
-- créé — les uploads d'annonces échouaient silencieusement et remontaient
-- comme "erreur inattendue" avec un code de suivi côté client.
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'listings',
  'listings',
  true,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public           = EXCLUDED.public,
    file_size_limit  = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "listings_insert_own_folder" ON storage.objects;
DROP POLICY IF EXISTS "listings_select_public"     ON storage.objects;
DROP POLICY IF EXISTS "listings_delete_own"        ON storage.objects;
DROP POLICY IF EXISTS "listings_update_own"        ON storage.objects;

-- Path convention: listings/<uid>/<random>.<ext>
CREATE POLICY "listings_insert_own_folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'listings'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Public read — les photos s'affichent sur la grille d'annonces publique.
CREATE POLICY "listings_select_public"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'listings');

CREATE POLICY "listings_delete_own"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'listings'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "listings_update_own"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'listings'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
