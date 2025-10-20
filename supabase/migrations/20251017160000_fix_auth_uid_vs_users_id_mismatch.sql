-- ============================================================================
-- Migration: Fix auth.uid() vs users.id Mismatch
-- Date: 2025-10-17
-- Description: Correction complète du problème de confusion entre auth.uid()
--              (qui retourne users.auth_user_id) et users.id (PK de la table users)
-- Impact: Débloque la création de quotes + Fix tous les helpers RLS bugués
-- ============================================================================

-- ============================================================================
-- SECTION 1: HELPER FUNCTION - Conversion auth.uid() → users.id
-- ============================================================================

-- ----------------------------------------------------------------------------
-- get_current_user_id() - Convertit auth.uid() en users.id
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Lookup users.id depuis auth.uid() (users.auth_user_id)
  SELECT id INTO v_user_id
  FROM public.users
  WHERE auth_user_id = auth.uid();

  RETURN v_user_id;
END;
$$;

COMMENT ON FUNCTION get_current_user_id() IS
'Convertit auth.uid() (auth_user_id) en users.id (PK table users). Fonction helper centralisée pour éviter la confusion entre les 2 UUIDs différents. Utilisée par les triggers et helpers RLS.';

-- ============================================================================
-- SECTION 2: FIX TRIGGER - log_intervention_status_change
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Corriger le trigger qui log les changements de statut d'intervention
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION log_intervention_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO activity_logs (
      team_id,
      user_id,
      action_type,
      entity_type,
      entity_id,
      entity_name,
      description,
      metadata
    ) VALUES (
      NEW.team_id,
      get_current_user_id(),  -- ✅ FIX: Utilise helper au lieu de auth.uid()
      'status_change',
      'intervention',
      NEW.id,
      NEW.reference,
      'Changement statut: ' || OLD.status || ' → ' || NEW.status,
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status,
        'intervention_title', NEW.title
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION log_intervention_status_change() IS
'✅ FIXÉ: Utilise get_current_user_id() pour convertir auth.uid() → users.id. Log les changements de statut d''intervention dans activity_logs avec le bon user_id.';

-- ============================================================================
-- SECTION 3: FIX RLS HELPERS - Correction de tous les helpers bugués
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Fix is_assigned_to_intervention() - user_id comparaison
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_assigned_to_intervention(p_intervention_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM intervention_assignments
    WHERE intervention_id = p_intervention_id
      AND user_id = get_current_user_id()  -- ✅ FIX: Utilise helper
  );
END;
$$;

COMMENT ON FUNCTION is_assigned_to_intervention IS
'✅ FIXÉ: Utilise get_current_user_id() pour vérifier assignation. Vérifie si l''utilisateur courant est assigné à l''intervention (gestionnaire ou prestataire).';

-- ----------------------------------------------------------------------------
-- 2. Fix is_tenant_of_intervention() - via intervention_assignments
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_tenant_of_intervention(p_intervention_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- ✅ FIX: Vérifie via intervention_assignments avec role='locataire'
  -- (tenant_id n'existe plus dans interventions depuis 20251015193000)
  RETURN EXISTS (
    SELECT 1
    FROM intervention_assignments ia
    WHERE ia.intervention_id = p_intervention_id
      AND ia.role = 'locataire'
      AND ia.user_id = get_current_user_id()  -- ✅ FIX: Utilise helper
  );
END;
$$;

COMMENT ON FUNCTION is_tenant_of_intervention IS
'✅ FIXÉ: Utilise get_current_user_id() + intervention_assignments. Vérifie si l''utilisateur courant est assigné comme locataire à l''intervention (tenant_id supprimé en 2025-10-15).';

-- ----------------------------------------------------------------------------
-- 3. Fix is_document_owner() - uploaded_by comparaison
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_document_owner(p_document_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM intervention_documents
    WHERE id = p_document_id
      AND uploaded_by = get_current_user_id()  -- ✅ FIX: Utilise helper
  );
END;
$$;

COMMENT ON FUNCTION is_document_owner IS
'✅ FIXÉ: Utilise get_current_user_id(). Vérifie si l''utilisateur courant a uploadé le document.';

-- ----------------------------------------------------------------------------
-- 4. Fix is_notification_recipient() - user_id comparaison
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_notification_recipient(p_notification_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM notifications
    WHERE id = p_notification_id
      AND user_id = get_current_user_id()  -- ✅ FIX: Utilise helper
  );
END;
$$;

COMMENT ON FUNCTION is_notification_recipient IS
'✅ FIXÉ: Utilise get_current_user_id(). Vérifie si l''utilisateur courant est le destinataire de la notification.';

-- ----------------------------------------------------------------------------
-- 5. Fix can_view_quote() - provider_id comparaison
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION can_view_quote(p_quote_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM intervention_quotes q
    INNER JOIN interventions i ON i.id = q.intervention_id
    WHERE q.id = p_quote_id
      AND (
        is_tenant_of_intervention(q.intervention_id)
        OR is_manager_of_intervention_team(q.intervention_id)
        OR q.provider_id = get_current_user_id()  -- ✅ FIX: Utilise helper
      )
  );
END;
$$;

COMMENT ON FUNCTION can_view_quote IS
'✅ FIXÉ: Utilise get_current_user_id() pour provider_id. Vérifie si l''utilisateur peut voir le devis (locataire, gestionnaire, ou prestataire créateur).';

-- ----------------------------------------------------------------------------
-- 6. Fix can_manage_quote() - provider_id comparaison
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION can_manage_quote(p_quote_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM intervention_quotes q
    WHERE q.id = p_quote_id
      AND (
        q.provider_id = get_current_user_id()  -- ✅ FIX: Utilise helper
        OR is_manager_of_intervention_team(q.intervention_id)
      )
  );
END;
$$;

COMMENT ON FUNCTION can_manage_quote IS
'✅ FIXÉ: Utilise get_current_user_id() pour provider_id. Vérifie si l''utilisateur peut gérer le devis (prestataire créateur ou gestionnaire équipe).';

-- ----------------------------------------------------------------------------
-- 7. Fix can_view_conversation() - user_id comparaison dans participants
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION can_view_conversation(p_thread_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM conversation_threads ct
    WHERE ct.id = p_thread_id
      AND (
        -- Participant explicite
        EXISTS (
          SELECT 1 FROM conversation_participants cp
          WHERE cp.thread_id = p_thread_id
            AND cp.user_id = get_current_user_id()  -- ✅ FIX: Utilise helper
        )
        OR
        -- Gestionnaire de l'équipe (transparence équipe)
        is_manager_of_intervention_team(ct.intervention_id)
      )
  );
END;
$$;

COMMENT ON FUNCTION can_view_conversation IS
'✅ FIXÉ: Utilise get_current_user_id() pour vérifier participants. Vérifie si l''utilisateur peut voir la conversation (participant ou manager équipe via transparence).';

-- ----------------------------------------------------------------------------
-- 8. Fix can_view_report() - created_by comparaison
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION can_view_report(p_report_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM intervention_reports r
    WHERE r.id = p_report_id
      AND (
        -- Gestionnaire de l'équipe voit tout
        is_team_manager(r.team_id)
        OR
        -- Créateur voit son rapport
        r.created_by = get_current_user_id()  -- ✅ FIX: Utilise helper
        OR
        -- Locataire voit si pas internal
        (
          NOT r.is_internal
          AND is_tenant_of_intervention(r.intervention_id)
        )
        OR
        -- Prestataire assigné voit si pas internal
        (
          NOT r.is_internal
          AND is_assigned_to_intervention(r.intervention_id)
        )
      )
  );
END;
$$;

COMMENT ON FUNCTION can_view_report IS
'✅ FIXÉ: Utilise get_current_user_id() pour created_by. Vérifie si l''utilisateur peut voir le rapport (selon is_internal et rôle).';

-- ============================================================================
-- SECTION 4: FIX RLS POLICIES - Policies avec comparaisons directes
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Fix policies interventions - NOTE: tenant_id supprimé en 2025-10-15
-- ----------------------------------------------------------------------------

-- NOTE: La policy interventions_insert (pour locataires) a été supprimée en 2025-10-15
-- car tenant_id n'existe plus. Les gestionnaires créent les interventions via
-- interventions_insert_manager, puis assignent les locataires via intervention_assignments.
-- Aucune modification nécessaire ici.

DROP POLICY IF EXISTS "interventions_update" ON public.interventions;

CREATE POLICY "interventions_update" ON public.interventions
  FOR UPDATE
  USING (
    deleted_at IS NULL
    AND (
      can_manage_intervention(id)
      OR is_tenant_of_intervention(id)  -- ✅ FIX: Vérifie via intervention_assignments
    )
  )
  WITH CHECK (
    deleted_at IS NULL
    AND (
      can_manage_intervention(id)
      OR is_tenant_of_intervention(id)  -- ✅ FIX: Vérifie via intervention_assignments
    )
  );

COMMENT ON POLICY "interventions_update" ON public.interventions IS
'✅ FIXÉ: Utilise is_tenant_of_intervention() qui vérifie via intervention_assignments. Gestionnaires d''équipe + locataire assigné peuvent modifier.';

-- ----------------------------------------------------------------------------
-- Fix policies conversation_threads - created_by comparaison
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "threads_insert" ON public.conversation_threads;

CREATE POLICY "threads_insert" ON public.conversation_threads
  FOR INSERT
  WITH CHECK (
    created_by = get_current_user_id()  -- ✅ FIX: Utilise helper
    AND is_manager_of_intervention_team(intervention_id)
  );

COMMENT ON POLICY "threads_insert" ON public.conversation_threads IS
'✅ FIXÉ: Utilise get_current_user_id() pour created_by. Seuls les gestionnaires d''équipe peuvent créer des threads de conversation.';

-- ----------------------------------------------------------------------------
-- Fix policies conversation_messages - user_id comparaisons
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "messages_insert" ON public.conversation_messages;

CREATE POLICY "messages_insert" ON public.conversation_messages
  FOR INSERT
  WITH CHECK (
    user_id = get_current_user_id()  -- ✅ FIX: Utilise helper
    AND can_send_message_in_thread(thread_id)
  );

COMMENT ON POLICY "messages_insert" ON public.conversation_messages IS
'✅ FIXÉ: Utilise get_current_user_id() pour user_id. Tous les participants autorisés peuvent envoyer des messages.';

DROP POLICY IF EXISTS "messages_update" ON public.conversation_messages;

CREATE POLICY "messages_update" ON public.conversation_messages
  FOR UPDATE
  USING (user_id = get_current_user_id())  -- ✅ FIX: Utilise helper
  WITH CHECK (user_id = get_current_user_id());  -- ✅ FIX: Utilise helper

COMMENT ON POLICY "messages_update" ON public.conversation_messages IS
'✅ FIXÉ: Utilise get_current_user_id() pour user_id. Seul l''auteur peut modifier son message (soft delete uniquement).';

-- ----------------------------------------------------------------------------
-- Fix policies conversation_participants - user_id comparaisons
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "participants_select" ON public.conversation_participants;

CREATE POLICY "participants_select" ON public.conversation_participants
  FOR SELECT
  USING (
    user_id = get_current_user_id()  -- ✅ FIX: Utilise helper
    OR can_view_conversation(thread_id)
  );

COMMENT ON POLICY "participants_select" ON public.conversation_participants IS
'✅ FIXÉ: Utilise get_current_user_id() pour user_id. Les participants eux-mêmes ou les gestionnaires peuvent voir.';

DROP POLICY IF EXISTS "participants_update" ON public.conversation_participants;

CREATE POLICY "participants_update" ON public.conversation_participants
  FOR UPDATE
  USING (user_id = get_current_user_id())  -- ✅ FIX: Utilise helper
  WITH CHECK (user_id = get_current_user_id());  -- ✅ FIX: Utilise helper

COMMENT ON POLICY "participants_update" ON public.conversation_participants IS
'✅ FIXÉ: Utilise get_current_user_id() pour user_id. Les utilisateurs peuvent mettre à jour leur propre last_read.';

-- ----------------------------------------------------------------------------
-- Fix policies notifications - user_id comparaisons
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "notifications_select" ON public.notifications;

CREATE POLICY "notifications_select" ON public.notifications
  FOR SELECT
  USING (user_id = get_current_user_id());  -- ✅ FIX: Utilise helper

COMMENT ON POLICY "notifications_select" ON public.notifications IS
'✅ FIXÉ: Utilise get_current_user_id() pour user_id. Les utilisateurs ne voient que leurs propres notifications.';

DROP POLICY IF EXISTS "notifications_update" ON public.notifications;

CREATE POLICY "notifications_update" ON public.notifications
  FOR UPDATE
  USING (user_id = get_current_user_id())  -- ✅ FIX: Utilise helper
  WITH CHECK (user_id = get_current_user_id());  -- ✅ FIX: Utilise helper

COMMENT ON POLICY "notifications_update" ON public.notifications IS
'✅ FIXÉ: Utilise get_current_user_id() pour user_id. Destinataire peut marquer lu/archivé.';

DROP POLICY IF EXISTS "notifications_delete" ON public.notifications;

CREATE POLICY "notifications_delete" ON public.notifications
  FOR DELETE
  USING (user_id = get_current_user_id());  -- ✅ FIX: Utilise helper

COMMENT ON POLICY "notifications_delete" ON public.notifications IS
'✅ FIXÉ: Utilise get_current_user_id() pour user_id. Destinataire peut supprimer ses notifications.';

-- ----------------------------------------------------------------------------
-- Fix policies intervention_reports - created_by comparaisons
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "reports_insert" ON public.intervention_reports;

CREATE POLICY "reports_insert" ON public.intervention_reports
  FOR INSERT
  WITH CHECK (
    created_by = get_current_user_id()  -- ✅ FIX: Utilise helper
    AND can_view_intervention(intervention_id)
  );

COMMENT ON POLICY "reports_insert" ON public.intervention_reports IS
'✅ FIXÉ: Utilise get_current_user_id() pour created_by. Tous les participants peuvent créer des rapports.';

DROP POLICY IF EXISTS "reports_update" ON public.intervention_reports;

CREATE POLICY "reports_update" ON public.intervention_reports
  FOR UPDATE
  USING (
    deleted_at IS NULL
    AND (
      created_by = get_current_user_id()  -- ✅ FIX: Utilise helper
      OR is_team_manager(team_id)
    )
  )
  WITH CHECK (
    deleted_at IS NULL
    AND (
      created_by = get_current_user_id()  -- ✅ FIX: Utilise helper
      OR is_team_manager(team_id)
    )
  );

COMMENT ON POLICY "reports_update" ON public.intervention_reports IS
'✅ FIXÉ: Utilise get_current_user_id() pour created_by. Créateur ou gestionnaires peuvent modifier.';

-- ----------------------------------------------------------------------------
-- Fix policies intervention_documents - uploaded_by comparaisons
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "documents_insert" ON public.intervention_documents;

CREATE POLICY "documents_insert" ON public.intervention_documents
  FOR INSERT
  WITH CHECK (
    uploaded_by = get_current_user_id()  -- ✅ FIX: Utilise helper
    AND can_view_intervention(intervention_id)
  );

COMMENT ON POLICY "documents_insert" ON public.intervention_documents IS
'✅ FIXÉ: Utilise get_current_user_id() pour uploaded_by. Tous les participants peuvent uploader des documents.';

DROP POLICY IF EXISTS "documents_update" ON public.intervention_documents;

CREATE POLICY "documents_update" ON public.intervention_documents
  FOR UPDATE
  USING (
    deleted_at IS NULL
    AND (
      uploaded_by = get_current_user_id()  -- ✅ FIX: Utilise helper
      OR can_validate_document(id)
    )
  )
  WITH CHECK (
    deleted_at IS NULL
    AND (
      uploaded_by = get_current_user_id()  -- ✅ FIX: Utilise helper
      OR can_validate_document(id)
    )
  );

COMMENT ON POLICY "documents_update" ON public.intervention_documents IS
'✅ FIXÉ: Utilise get_current_user_id() pour uploaded_by. Uploadeur ou gestionnaires (pour validation) peuvent modifier.';

DROP POLICY IF EXISTS "documents_delete" ON public.intervention_documents;

CREATE POLICY "documents_delete" ON public.intervention_documents
  FOR UPDATE
  USING (
    uploaded_by = get_current_user_id()  -- ✅ FIX: Utilise helper
    OR can_manage_intervention(intervention_id)
  );

COMMENT ON POLICY "documents_delete" ON public.intervention_documents IS
'✅ FIXÉ: Utilise get_current_user_id() pour uploaded_by. Uploadeur ou gestionnaires peuvent supprimer (soft delete).';

-- ============================================================================
-- FIN DE LA MIGRATION
-- ============================================================================
