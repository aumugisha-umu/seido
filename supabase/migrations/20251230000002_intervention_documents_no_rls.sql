-- =============================================================================
-- SEIDO APP - CORRECTION INTERVENTION DOCUMENTS (SANS RLS)
-- =============================================================================
-- Date: 29 décembre 2025
-- Version: Sans RLS pour tests
-- ⚠️ TEMPORAIRE: Cette migration désactive les RLS pour permettre les tests

-- =============================================================================
-- 1. FIX FOREIGN KEY CONSTRAINT ON INTERVENTION_DOCUMENTS
-- =============================================================================

-- Check if intervention_documents table exists
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'intervention_documents'
    ) THEN
        -- Drop existing foreign key constraint if it exists
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'intervention_documents_uploaded_by_fkey'
            AND table_name = 'intervention_documents'
        ) THEN
            ALTER TABLE intervention_documents
            DROP CONSTRAINT intervention_documents_uploaded_by_fkey;
            RAISE NOTICE '🔧 Dropped existing foreign key constraint';
        END IF;

        -- Add corrected foreign key constraint
        ALTER TABLE intervention_documents
        ADD CONSTRAINT intervention_documents_uploaded_by_fkey
        FOREIGN KEY (uploaded_by) REFERENCES users(id);

        RAISE NOTICE '✅ Fixed foreign key constraint: uploaded_by -> users(id)';
    ELSE
        RAISE NOTICE '⚠️ Table intervention_documents does not exist yet';
    END IF;
END
$$;

-- =============================================================================
-- 2. DISABLE ALL RLS FOR TESTING
-- =============================================================================

-- Disable RLS on intervention_documents if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'intervention_documents'
    ) THEN
        ALTER TABLE intervention_documents DISABLE ROW LEVEL SECURITY;
        RAISE NOTICE '🔓 RLS disabled on intervention_documents for testing';
    END IF;
END
$$;

-- Disable RLS on storage.objects (system table)
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
RAISE NOTICE '🔓 RLS disabled on storage.objects for testing';

-- =============================================================================
-- 3. DROP EXISTING RLS POLICIES (IF ANY)
-- =============================================================================

-- Drop policies on intervention_documents
DROP POLICY IF EXISTS "Users can view intervention documents" ON intervention_documents;
DROP POLICY IF EXISTS "Users can upload documents" ON intervention_documents;
DROP POLICY IF EXISTS "Users can update their own documents" ON intervention_documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON intervention_documents;

-- Drop common storage policies (names may vary)
DROP POLICY IF EXISTS "Give users access to own folder 1oj01fe_0" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1oj01fe_1" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1oj01fe_2" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1oj01fe_3" ON storage.objects;

RAISE NOTICE '🧹 Cleaned up existing RLS policies';

-- =============================================================================
-- 4. CREATE HELPER FUNCTION TO GET DATABASE USER ID FROM AUTH USER ID
-- =============================================================================

CREATE OR REPLACE FUNCTION get_user_id_from_auth()
RETURNS UUID AS $$
DECLARE
    user_id UUID;
BEGIN
    SELECT id INTO user_id
    FROM users
    WHERE auth_user_id = auth.uid();

    RETURN user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

RAISE NOTICE '✅ Helper function get_user_id_from_auth() created';

-- =============================================================================
-- 5. ENSURE STORAGE BUCKET EXISTS
-- =============================================================================

-- Ensure intervention-documents bucket exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'intervention-documents',
  'intervention-documents',
  false,
  10485760, -- 10MB limit
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'application/zip'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

RAISE NOTICE '📦 Storage bucket intervention-documents ensured';

-- =============================================================================
-- FINAL STATUS
-- =============================================================================

RAISE NOTICE '🎉 Migration completed - RLS DISABLED for testing';
RAISE NOTICE '⚠️ REMEMBER: Re-enable RLS in production!';
RAISE NOTICE '📝 Use disable-all-rls-temp.sql for additional cleanup if needed';