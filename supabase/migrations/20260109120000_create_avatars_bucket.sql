-- ============================================
-- MIGRATION: Create avatars storage bucket
-- Date: 2026-01-09
-- Purpose: Store user profile pictures
-- Path format: {auth_user_id}/{filename}
-- ============================================

-- 1. Create bucket (public for direct avatar display)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,  -- Public pour affichage direct des avatars
  5242880,  -- 5MB max
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================
-- 2. RLS Policies for storage.objects
-- ============================================

-- DROP existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "avatars_insert" ON storage.objects;
DROP POLICY IF EXISTS "avatars_select" ON storage.objects;
DROP POLICY IF EXISTS "avatars_update" ON storage.objects;
DROP POLICY IF EXISTS "avatars_delete" ON storage.objects;

-- INSERT: Users can upload avatars to their own folder only
-- Path must start with their auth.uid()
CREATE POLICY "avatars_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- SELECT: Anyone can view avatars (public bucket for profile display)
CREATE POLICY "avatars_select"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- UPDATE: Users can only update their own avatars
CREATE POLICY "avatars_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- DELETE: Users can only delete their own avatars
CREATE POLICY "avatars_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================
-- 3. Grant permissions
-- ============================================
GRANT ALL ON storage.objects TO authenticated;
GRANT SELECT ON storage.objects TO anon;
