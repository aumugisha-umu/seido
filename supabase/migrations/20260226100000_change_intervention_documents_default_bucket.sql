-- ============================================================================
-- Migration: Change intervention_documents.storage_bucket default to 'documents'
-- Created: 2026-02-26
-- Description: Part of the unified 'documents' bucket consolidation.
--              All upload paths now write to 'documents' bucket.
--              This migration aligns the DB default with the new code behavior.
--              Existing records keep their original storage_bucket value.
-- ============================================================================

-- Change default for new records
ALTER TABLE public.intervention_documents
  ALTER COLUMN storage_bucket SET DEFAULT 'documents';

-- Update the column comment to reflect the new default
COMMENT ON COLUMN public.intervention_documents.storage_bucket
  IS 'Bucket Supabase Storage (documents — unified bucket since 2026-02-20, legacy records may have intervention-documents)';

-- ============================================================================
-- END
-- ============================================================================
