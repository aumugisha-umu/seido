-- ============================================================================
-- MIGRATION: Create contract-documents storage bucket
-- ============================================================================
-- Date: 2025-12-05
-- Description: Bucket Supabase Storage pour les documents de contrats
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Create the storage bucket for contract documents
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'contract-documents',
  'contract-documents',
  false,  -- Private bucket (requires auth)
  52428800,  -- 50MB max file size
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- RLS Policies for contract-documents bucket
-- ----------------------------------------------------------------------------

-- Policy: Allow authenticated users to upload documents
-- (Business logic validation done at application level via contract ownership)
CREATE POLICY "contract_documents_upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'contract-documents'
  AND (
    -- Admin peut tout uploader
    is_admin()
    -- Gestionnaire peut uploader
    OR is_gestionnaire()
  )
);

-- Policy: Allow users to view documents they have access to
-- The path format is: team_id/contract_id/filename
CREATE POLICY "contract_documents_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'contract-documents'
  AND (
    is_admin()
    OR is_gestionnaire()
    -- Locataire peut voir ses documents via can_view_contract au niveau app
  )
);

-- Policy: Allow managers to update documents
CREATE POLICY "contract_documents_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'contract-documents'
  AND (is_admin() OR is_gestionnaire())
)
WITH CHECK (
  bucket_id = 'contract-documents'
  AND (is_admin() OR is_gestionnaire())
);

-- Policy: Allow managers to delete documents
CREATE POLICY "contract_documents_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'contract-documents'
  AND (is_admin() OR is_gestionnaire())
);

-- ============================================================================
-- FIN DE LA MIGRATION BUCKET
-- ============================================================================
