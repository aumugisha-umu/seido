-- Tighten email-attachments bucket RLS policies
-- Previously: any authenticated user could access any team's email attachments
-- Now: team-level isolation via path-based team_id extraction
-- Path format: {team_id}/{timestamp}_{filename}

-- ============================================================================
-- PART 1: Drop existing broad policies
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can upload email attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read email attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete email attachments" ON storage.objects;

-- ============================================================================
-- PART 2: Create team-scoped policies
-- Reuses get_team_id_from_document_path() which extracts first UUID segment
-- (same path convention: {team_id}/...)
-- ============================================================================

-- Policy 1: INSERT - team members can upload to their team's folder
CREATE POLICY "email_attachments_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'email-attachments'
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

-- Policy 2: SELECT - team members can read their team's attachments
CREATE POLICY "email_attachments_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'email-attachments'
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

-- Policy 3: DELETE - team admins/gestionnaires can delete their team's attachments
CREATE POLICY "email_attachments_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'email-attachments'
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
