-- =============================================================================
-- FIX INTERVENTION DOCUMENTS STORAGE AND USER REFERENCES
-- =============================================================================
-- Date: 30 décembre 2025
-- Description: Fix user reference and add RLS policies for intervention documents
-- =============================================================================

-- =============================================================================
-- 1. FIX INTERVENTION_DOCUMENTS TABLE
-- =============================================================================

-- First, drop the incorrect foreign key constraint if it exists
ALTER TABLE intervention_documents
DROP CONSTRAINT IF EXISTS intervention_documents_uploaded_by_fkey;

-- Add the correct foreign key constraint to reference users table instead of auth.users
ALTER TABLE intervention_documents
ADD CONSTRAINT intervention_documents_uploaded_by_fkey
FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL;

-- Do the same for validated_by column
ALTER TABLE intervention_documents
DROP CONSTRAINT IF EXISTS intervention_documents_validated_by_fkey;

ALTER TABLE intervention_documents
ADD CONSTRAINT intervention_documents_validated_by_fkey
FOREIGN KEY (validated_by) REFERENCES users(id) ON DELETE SET NULL;

-- =============================================================================
-- 2. CREATE RLS POLICIES FOR INTERVENTION_DOCUMENTS TABLE
-- =============================================================================

-- Enable RLS on intervention_documents table if not already enabled
ALTER TABLE intervention_documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view documents from their team interventions" ON intervention_documents;
DROP POLICY IF EXISTS "Users can upload documents to their team interventions" ON intervention_documents;
DROP POLICY IF EXISTS "Users can update their own documents" ON intervention_documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON intervention_documents;

-- Policy: Users can view documents from interventions they have access to
CREATE POLICY "Users can view documents from their team interventions"
  ON intervention_documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM interventions i
      JOIN team_members tm ON tm.team_id = i.team_id
      JOIN users u ON u.id = tm.user_id
      WHERE i.id = intervention_id
      AND u.auth_user_id = auth.uid()
    )
    OR
    -- Tenant can see documents from their own interventions
    EXISTS (
      SELECT 1 FROM interventions i
      JOIN users u ON u.id = i.tenant_id
      WHERE i.id = intervention_id
      AND u.auth_user_id = auth.uid()
    )
    OR
    -- Provider can see documents from interventions they're assigned to
    EXISTS (
      SELECT 1 FROM intervention_contacts ic
      JOIN users u ON u.id = ic.user_id
      WHERE ic.intervention_id = intervention_documents.intervention_id
      AND u.auth_user_id = auth.uid()
    )
  );

-- Policy: Users can upload documents to interventions they have access to
CREATE POLICY "Users can upload documents to their team interventions"
  ON intervention_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Check if user is member of the team that owns the intervention
    EXISTS (
      SELECT 1 FROM interventions i
      JOIN team_members tm ON tm.team_id = i.team_id
      JOIN users u ON u.id = tm.user_id
      WHERE i.id = intervention_id
      AND u.auth_user_id = auth.uid()
    )
    OR
    -- Tenant can upload documents to their own interventions
    EXISTS (
      SELECT 1 FROM interventions i
      JOIN users u ON u.id = i.tenant_id
      WHERE i.id = intervention_id
      AND u.auth_user_id = auth.uid()
    )
    OR
    -- Provider can upload documents to interventions they're assigned to
    EXISTS (
      SELECT 1 FROM intervention_contacts ic
      JOIN users u ON u.id = ic.user_id
      WHERE ic.intervention_id = intervention_documents.intervention_id
      AND u.auth_user_id = auth.uid()
    )
  );

-- Policy: Users can update documents they uploaded
CREATE POLICY "Users can update their own documents"
  ON intervention_documents
  FOR UPDATE
  TO authenticated
  USING (
    uploaded_by = (SELECT id FROM users WHERE auth_user_id = auth.uid())
    OR
    -- Managers can update any document in their team's interventions
    EXISTS (
      SELECT 1 FROM interventions i
      JOIN team_members tm ON tm.team_id = i.team_id
      JOIN users u ON u.id = tm.user_id
      WHERE i.id = intervention_id
      AND u.auth_user_id = auth.uid()
      AND u.role = 'gestionnaire'
    )
  );

-- Policy: Users can delete documents they uploaded
CREATE POLICY "Users can delete their own documents"
  ON intervention_documents
  FOR DELETE
  TO authenticated
  USING (
    uploaded_by = (SELECT id FROM users WHERE auth_user_id = auth.uid())
    OR
    -- Managers can delete any document in their team's interventions
    EXISTS (
      SELECT 1 FROM interventions i
      JOIN team_members tm ON tm.team_id = i.team_id
      JOIN users u ON u.id = tm.user_id
      WHERE i.id = intervention_id
      AND u.auth_user_id = auth.uid()
      AND u.role = 'gestionnaire'
    )
  );

-- =============================================================================
-- 3. STORAGE RLS POLICIES (Manual Configuration Required)
-- =============================================================================

-- IMPORTANT: Storage RLS policies must be configured via Supabase Dashboard
-- Navigate to Storage > intervention-documents > Policies
--
-- Create the following policies:
--
-- 1. SELECT Policy: "Authenticated users can view documents"
--    - Enable for SELECT
--    - Target roles: authenticated
--    - Using expression:
--      bucket_name = 'intervention-documents'
--      AND auth.role() = 'authenticated'
--
-- 2. INSERT Policy: "Authenticated users can upload documents"
--    - Enable for INSERT
--    - Target roles: authenticated
--    - With check expression:
--      bucket_name = 'intervention-documents'
--      AND auth.role() = 'authenticated'
--      AND (storage.foldername(name))[1] = 'interventions'
--
-- 3. UPDATE Policy: "Users can update their own documents"
--    - Enable for UPDATE
--    - Target roles: authenticated
--    - Using expression:
--      bucket_name = 'intervention-documents'
--      AND auth.role() = 'authenticated'
--    - With check expression:
--      bucket_name = 'intervention-documents'
--      AND auth.role() = 'authenticated'
--
-- 4. DELETE Policy: "Users can delete their own documents"
--    - Enable for DELETE
--    - Target roles: authenticated
--    - Using expression:
--      bucket_name = 'intervention-documents'
--      AND auth.role() = 'authenticated'

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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_id_from_auth() TO authenticated;

-- =============================================================================
-- 5. VALIDATION AND SUMMARY
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '=== INTERVENTION DOCUMENTS STORAGE FIX APPLIED ===';
    RAISE NOTICE '✅ Fixed foreign key constraints to reference users table instead of auth.users';
    RAISE NOTICE '✅ Created RLS policies for intervention_documents table';
    RAISE NOTICE '✅ Created helper function get_user_id_from_auth()';
    RAISE NOTICE '📋 Storage RLS policies must be configured manually via Dashboard';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  IMPORTANT NEXT STEPS:';
    RAISE NOTICE '1. Apply Storage RLS policies via Supabase Dashboard';
    RAISE NOTICE '2. Update API route to use database user ID instead of auth user ID';
    RAISE NOTICE '3. Test file upload with all user roles';
END $$;