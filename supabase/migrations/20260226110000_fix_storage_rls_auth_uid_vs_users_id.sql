-- Fix storage RLS policies: auth.uid() → get_my_profile_ids()
--
-- ROOT CAUSE: The 'documents' and 'email-attachments' bucket policies compare
-- tm.user_id = auth.uid(), but team_members.user_id stores users.id (database PK),
-- NOT auth.uid() (Supabase Auth UUID). These are different UUIDs.
--
-- The legacy 'intervention-documents' bucket correctly uses get_current_user_id().
-- For multi-profile support, we use get_my_profile_ids() which returns ALL
-- users.id values for a given auth.uid().
--
-- Affected: INSERT, SELECT, DELETE on both 'documents' and 'email-attachments'.
-- UPDATE on 'documents' uses owner_id = auth.uid()::text which is correct
-- (storage.objects.owner_id IS the auth UUID directly).

-- ============================================================
-- 1. FIX 'documents' BUCKET POLICIES
-- ============================================================

-- DROP existing policies
DROP POLICY IF EXISTS "documents_insert" ON storage.objects;
DROP POLICY IF EXISTS "documents_select" ON storage.objects;
DROP POLICY IF EXISTS "documents_delete" ON storage.objects;
-- Keep documents_update — it uses owner_id = auth.uid()::text which is correct

-- INSERT: any team member (all roles) can upload to their team's folder
CREATE POLICY "documents_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.user_id IN (SELECT get_my_profile_ids())
        AND tm.team_id = get_team_id_from_document_path(name)
        AND tm.left_at IS NULL
    )
  )
);

-- SELECT: any team member can view their team's documents
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
      WHERE tm.user_id IN (SELECT get_my_profile_ids())
        AND tm.team_id = get_team_id_from_document_path(name)
        AND tm.left_at IS NULL
    )
  )
);

-- DELETE: admin/gestionnaire can delete any team document, OR the uploader can delete their own
-- owner_id check needed for error-recovery cleanup (DB insert fails after storage upload)
CREATE POLICY "documents_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (
    is_admin()
    OR owner_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.user_id IN (SELECT get_my_profile_ids())
        AND tm.team_id = get_team_id_from_document_path(name)
        AND tm.role IN ('admin', 'gestionnaire')
        AND tm.left_at IS NULL
    )
  )
);

-- ============================================================
-- 2. FIX 'email-attachments' BUCKET POLICIES
-- ============================================================

-- DROP existing policies (created in 20260225100000)
DROP POLICY IF EXISTS "email_attachments_insert" ON storage.objects;
DROP POLICY IF EXISTS "email_attachments_select" ON storage.objects;
DROP POLICY IF EXISTS "email_attachments_delete" ON storage.objects;

-- INSERT: any team member can upload email attachments to their team's folder
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
      WHERE tm.user_id IN (SELECT get_my_profile_ids())
        AND tm.team_id = get_team_id_from_document_path(name)
        AND tm.left_at IS NULL
    )
  )
);

-- SELECT: any team member can view their team's email attachments
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
      WHERE tm.user_id IN (SELECT get_my_profile_ids())
        AND tm.team_id = get_team_id_from_document_path(name)
        AND tm.left_at IS NULL
    )
  )
);

-- DELETE: admin/gestionnaire can delete any team attachment, OR the uploader can delete their own
CREATE POLICY "email_attachments_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'email-attachments'
  AND (
    is_admin()
    OR owner_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.user_id IN (SELECT get_my_profile_ids())
        AND tm.team_id = get_team_id_from_document_path(name)
        AND tm.role IN ('admin', 'gestionnaire')
        AND tm.left_at IS NULL
    )
  )
);
