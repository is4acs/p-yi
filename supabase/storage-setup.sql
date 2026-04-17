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
