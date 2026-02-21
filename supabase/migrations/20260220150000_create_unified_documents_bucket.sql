-- ============================================================================
-- Migration: Create unified 'documents' Storage Bucket
-- Created: 2026-02-20
-- Description: Single storage bucket for all document types (property,
--              intervention, contract). Replaces the missing 'property-documents'
--              bucket and consolidates storage while keeping separate DB tables.
-- ============================================================================

-- ============================================================================
-- PART 1: Create Storage Bucket
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false, -- Private bucket, access via signed URLs only
  52428800, -- 50 MB limit (50 * 1024 * 1024)
  ARRAY[
    -- Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    -- Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'application/zip',
    'application/x-zip-compressed',
    -- Audio (voice notes from intervention documents)
    'audio/webm',
    'audio/mp4',
    'audio/mpeg'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================================
-- PART 2: Helper Function for Storage RLS
-- ============================================================================

-- Path format: {team_id}/{entity_id}/{filename}
-- The team_id is the first segment of the path
CREATE OR REPLACE FUNCTION get_team_id_from_document_path(storage_path TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  v_team_id UUID;
BEGIN
  -- Extract team_id from path (first UUID segment)
  v_team_id := (regexp_matches(storage_path, '^([a-f0-9-]{36})/'))[1]::UUID;
  RETURN v_team_id;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

-- ============================================================================
-- PART 3: RLS Policies for storage.objects
-- ============================================================================

DROP POLICY IF EXISTS "documents_insert" ON storage.objects;
DROP POLICY IF EXISTS "documents_select" ON storage.objects;
DROP POLICY IF EXISTS "documents_update" ON storage.objects;
DROP POLICY IF EXISTS "documents_delete" ON storage.objects;

-- Policy 1: INSERT - authenticated users who are team members
CREATE POLICY "documents_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (
    -- Admin can upload anywhere
    is_admin()
    -- Team members can upload to their team's path
    OR EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.user_id = auth.uid()
        AND tm.team_id = get_team_id_from_document_path(name)
        AND tm.left_at IS NULL
    )
  )
);

-- Policy 2: SELECT - authenticated users who are team members
CREATE POLICY "documents_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.user_id = auth.uid()
        AND tm.team_id = get_team_id_from_document_path(name)
        AND tm.left_at IS NULL
    )
  )
);

-- Policy 3: UPDATE - admin or original uploader
CREATE POLICY "documents_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (
    is_admin()
    OR owner_id = auth.uid()::text
  )
);

-- Policy 4: DELETE - admin or team managers
CREATE POLICY "documents_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.user_id = auth.uid()
        AND tm.team_id = get_team_id_from_document_path(name)
        AND tm.role IN ('admin', 'gestionnaire')
        AND tm.left_at IS NULL
    )
  )
);

-- ============================================================================
-- PART 4: Update property_documents default bucket
-- ============================================================================

ALTER TABLE public.property_documents
  ALTER COLUMN storage_bucket SET DEFAULT 'documents';

-- ============================================================================
-- END
-- ============================================================================
