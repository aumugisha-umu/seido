-- ============================================================================
-- Migration: Create intervention-documents Storage Bucket + RLS Policies
-- Created: 2025-10-27
-- Description: Creates Supabase Storage bucket for intervention documents
--              with team-based RLS policies for multi-tenant isolation
-- ============================================================================

-- ============================================================================
-- PART 1: Create Storage Bucket
-- ============================================================================

-- Create the intervention-documents bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'intervention-documents',
  'intervention-documents',
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
    'application/x-zip-compressed'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================================
-- PART 2: Helper Function for Storage RLS
-- ============================================================================

-- Function to get team_id from storage path
-- Path format: interventions/{intervention_id}/{filename}
CREATE OR REPLACE FUNCTION get_team_id_from_storage_path(storage_path TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_intervention_id UUID;
  v_team_id UUID;
BEGIN
  -- Extract intervention_id from path (format: interventions/{uuid}/filename)
  v_intervention_id := (regexp_matches(storage_path, 'interventions/([a-f0-9-]+)/'))[1]::UUID;

  -- Get team_id for this intervention
  SELECT team_id INTO v_team_id
  FROM interventions
  WHERE id = v_intervention_id;

  RETURN v_team_id;
EXCEPTION
  WHEN OTHERS THEN
    -- Return NULL if path parsing fails
    RETURN NULL;
END;
$$;

COMMENT ON FUNCTION get_team_id_from_storage_path IS 'Extract team_id from storage path for RLS checks';

-- ============================================================================
-- PART 3: RLS Policies for storage.objects
-- ============================================================================

-- Note: RLS is already enabled on storage.objects by default in Supabase
-- We don't need to ALTER TABLE here as we don't have ownership

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "intervention_documents_insert" ON storage.objects;
DROP POLICY IF EXISTS "intervention_documents_select" ON storage.objects;
DROP POLICY IF EXISTS "intervention_documents_update" ON storage.objects;
DROP POLICY IF EXISTS "intervention_documents_delete" ON storage.objects;

-- ----------------------------------------------------------------------------
-- Policy 1: INSERT - Upload documents
-- ----------------------------------------------------------------------------
-- Allow team members to upload to their team's interventions
CREATE POLICY "intervention_documents_insert"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'intervention-documents'
  AND
  (
    -- Admin can upload to any intervention
    EXISTS (
      SELECT 1 FROM users
      WHERE id = get_current_user_id()
        AND role = 'admin'
    )
    OR
    -- Team members can upload to their team's interventions
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.user_id = get_current_user_id()
        AND tm.team_id = get_team_id_from_storage_path(name)
        AND tm.left_at IS NULL
    )
  )
);

-- ----------------------------------------------------------------------------
-- Policy 2: SELECT - Download/View documents
-- ----------------------------------------------------------------------------
-- Allow team members to view their team's intervention documents
CREATE POLICY "intervention_documents_select"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'intervention-documents'
  AND
  (
    -- Admin can view all
    EXISTS (
      SELECT 1 FROM users
      WHERE id = get_current_user_id()
        AND role = 'admin'
    )
    OR
    -- Team members can view their team's documents
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.user_id = get_current_user_id()
        AND tm.team_id = get_team_id_from_storage_path(name)
        AND tm.left_at IS NULL
    )
  )
);

-- ----------------------------------------------------------------------------
-- Policy 3: UPDATE - Modify documents metadata (rare use case)
-- ----------------------------------------------------------------------------
-- Only allow admins and the original uploader to update
CREATE POLICY "intervention_documents_update"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'intervention-documents'
  AND
  (
    -- Admin can update
    EXISTS (
      SELECT 1 FROM users
      WHERE id = get_current_user_id()
        AND role = 'admin'
    )
    OR
    -- Original uploader can update (via owner_id)
    -- owner_id in storage.objects is text, auth.uid() returns uuid
    owner_id = auth.uid()::text
  )
);

-- ----------------------------------------------------------------------------
-- Policy 4: DELETE - Remove documents
-- ----------------------------------------------------------------------------
-- Allow admins and team managers to delete
CREATE POLICY "intervention_documents_delete"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'intervention-documents'
  AND
  (
    -- Admin can delete
    EXISTS (
      SELECT 1 FROM users
      WHERE id = get_current_user_id()
        AND role = 'admin'
    )
    OR
    -- Team managers can delete their team's documents
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.user_id = get_current_user_id()
        AND tm.team_id = get_team_id_from_storage_path(name)
        AND tm.role IN ('admin', 'gestionnaire')
        AND tm.left_at IS NULL
    )
  )
);

-- ============================================================================
-- PART 4: Documentation
-- ============================================================================
-- Note: Cannot add comments on storage.objects policies as we don't own the table
-- Policy descriptions:
--   - intervention_documents_insert: Allow team members to upload documents to their team's interventions
--   - intervention_documents_select: Allow team members to view/download their team's intervention documents
--   - intervention_documents_update: Allow admins and original uploaders to update document metadata
--   - intervention_documents_delete: Allow admins and team managers to delete intervention documents

-- ============================================================================
-- VERIFICATION QUERIES (for manual testing after migration)
-- ============================================================================

-- Verify bucket creation
-- SELECT id, name, public, file_size_limit FROM storage.buckets WHERE id = 'intervention-documents';

-- Verify RLS policies
-- SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';

-- Test helper function
-- SELECT get_team_id_from_storage_path('interventions/123e4567-e89b-12d3-a456-426614174000/test.pdf');
