-- ============================================================================
-- Migration: Réécriture Complète RLS intervention_quotes
-- Date: 2025-10-17 17:00
-- Description: Réécriture de TOUTES les RLS policies pour intervention_quotes
--              en suivant EXACTEMENT le pattern de intervention_assignments (qui fonctionne)
--              Utilise get_current_user_id() pour toutes les vérifications
-- Résout: Erreur 403 sur création de quotes (POST /intervention_quotes)
-- ============================================================================

-- ============================================================================
-- SECTION 1: Supprimer TOUTES les policies existantes
-- ============================================================================

DROP POLICY IF EXISTS "quotes_select" ON public.intervention_quotes;
DROP POLICY IF EXISTS "quotes_insert" ON public.intervention_quotes;
DROP POLICY IF EXISTS "quotes_update" ON public.intervention_quotes;
DROP POLICY IF EXISTS "quotes_delete" ON public.intervention_quotes;

-- ============================================================================
-- SECTION 2: Policy SELECT - Lecture granulaire des quotes
-- ============================================================================

CREATE POLICY "quotes_select"
ON public.intervention_quotes
FOR SELECT
TO authenticated
USING (
  deleted_at IS NULL
  AND (
    -- ========================================================================
    -- OPTION 1: Gestionnaire/admin de l'équipe de l'intervention
    -- ========================================================================
    -- Les managers voient TOUS les quotes de leurs interventions
    is_manager_of_intervention_team(intervention_id)

    OR

    -- ========================================================================
    -- OPTION 2: Provider du quote
    -- ========================================================================
    -- Chaque prestataire voit ses propres quotes (demandes + soumissions)
    provider_id = get_current_user_id()

    -- NOTE: Les locataires ne voient PAS les quotes pour l'instant
    -- Sera ajouté dans une future version si besoin
  )
);

COMMENT ON POLICY "quotes_select" ON public.intervention_quotes IS
'Lecture granulaire: (1) Gestionnaires équipe voient tous, (2) Prestataires voient leurs quotes. Locataires exclus pour l''instant. Utilise get_current_user_id().';

-- ============================================================================
-- SECTION 3: Policy INSERT - Création stricte (pattern intervention_assignments)
-- ============================================================================

CREATE POLICY "quotes_insert"
ON public.intervention_quotes
FOR INSERT
TO authenticated
WITH CHECK (
  deleted_at IS NULL

  -- ✅ CRITIQUE : created_by DOIT être l'utilisateur connecté
  -- Évite toute falsification (user ne peut pas créer au nom d'un autre)
  AND created_by = get_current_user_id()

  AND (
    -- ========================================================================
    -- CASE 1: Gestionnaire de l'équipe crée demande de devis pour un provider
    -- ========================================================================
    -- Le gestionnaire peut créer des demandes pour N'IMPORTE QUEL prestataire
    -- (provider_id peut être différent de created_by)
    EXISTS (
      SELECT 1
      FROM public.interventions i
      INNER JOIN public.team_members tm ON tm.team_id = i.team_id
      WHERE i.id = intervention_quotes.intervention_id
        AND tm.user_id = get_current_user_id()  -- Vérifie que user est membre équipe
        AND tm.role IN ('gestionnaire', 'admin')
        AND tm.left_at IS NULL
        AND i.deleted_at IS NULL
    )

    OR

    -- ========================================================================
    -- CASE 2: Prestataire assigné soumet son propre devis
    -- ========================================================================
    -- Le prestataire peut créer UNIQUEMENT pour lui-même
    -- (provider_id DOIT être égal à created_by)
    (
      provider_id = get_current_user_id()  -- Uniquement son propre devis

      AND EXISTS (
        SELECT 1
        FROM public.intervention_assignments ia
        WHERE ia.intervention_id = intervention_quotes.intervention_id
          AND ia.user_id = get_current_user_id()
          AND ia.role = 'prestataire'
      )
    )
  )
);

COMMENT ON POLICY "quotes_insert" ON public.intervention_quotes IS
'✅ PATTERN STRICT intervention_assignments: (1) created_by = user connecté OBLIGATOIRE, (2) Gestionnaires créent demandes pour tout provider, (3) Prestataires assignés créent uniquement leur devis. Utilise get_current_user_id().';

-- ============================================================================
-- SECTION 4: Policy UPDATE - Modification des quotes
-- ============================================================================

CREATE POLICY "quotes_update"
ON public.intervention_quotes
FOR UPDATE
TO authenticated
USING (
  deleted_at IS NULL
  AND (
    -- ========================================================================
    -- OPTION 1: Gestionnaire de l'équipe
    -- ========================================================================
    -- Les managers peuvent tout modifier (statut, montant, validation, etc.)
    is_manager_of_intervention_team(intervention_id)

    OR

    -- ========================================================================
    -- OPTION 2: Provider du quote
    -- ========================================================================
    -- Le prestataire peut modifier son propre quote
    -- (montant, description, line_items, status pour soumission)
    (
      provider_id = get_current_user_id()
      AND is_assigned_to_intervention(intervention_id)
    )
  )
)
WITH CHECK (
  deleted_at IS NULL
  AND (
    -- Même logique pour WITH CHECK
    is_manager_of_intervention_team(intervention_id)
    OR (provider_id = get_current_user_id() AND is_assigned_to_intervention(intervention_id))
  )
);

COMMENT ON POLICY "quotes_update" ON public.intervention_quotes IS
'Modification: (1) Gestionnaires équipe modifient tout, (2) Prestataires assignés modifient leur propre quote. Utilise get_current_user_id() + is_assigned_to_intervention().';

-- ============================================================================
-- SECTION 5: Policy DELETE - Soft delete uniquement (via UPDATE deleted_at)
-- ============================================================================

CREATE POLICY "quotes_delete"
ON public.intervention_quotes
FOR UPDATE
TO authenticated
USING (
  -- Seuls les gestionnaires de l'équipe peuvent soft-delete des quotes
  is_manager_of_intervention_team(intervention_id)
);

COMMENT ON POLICY "quotes_delete" ON public.intervention_quotes IS
'Soft delete (UPDATE deleted_at): SEULS les gestionnaires équipe peuvent supprimer. Utilise is_manager_of_intervention_team().';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Test 1: Compter les policies créées
DO $$
DECLARE
  v_policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE tablename = 'intervention_quotes'
    AND policyname IN ('quotes_select', 'quotes_insert', 'quotes_update', 'quotes_delete');

  IF v_policy_count = 4 THEN
    RAISE NOTICE '✅ 4 policies intervention_quotes créées avec succès';
  ELSE
    RAISE EXCEPTION '❌ ERREUR: Attendu 4 policies, trouvé %', v_policy_count;
  END IF;
END $$;

-- Test 2: Vérifier que les policies utilisent bien les helpers
DO $$
BEGIN
  -- Vérifier que get_current_user_id() est disponible
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'get_current_user_id'
  ) THEN
    RAISE NOTICE '✅ Helper get_current_user_id() disponible';
  ELSE
    RAISE EXCEPTION '❌ ERREUR: Helper get_current_user_id() manquant';
  END IF;

  -- Vérifier que is_manager_of_intervention_team() est disponible
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'is_manager_of_intervention_team'
  ) THEN
    RAISE NOTICE '✅ Helper is_manager_of_intervention_team() disponible';
  ELSE
    RAISE EXCEPTION '❌ ERREUR: Helper is_manager_of_intervention_team() manquant';
  END IF;

  -- Vérifier que is_tenant_of_intervention() est disponible
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'is_tenant_of_intervention'
  ) THEN
    RAISE NOTICE '✅ Helper is_tenant_of_intervention() disponible';
  ELSE
    RAISE EXCEPTION '❌ ERREUR: Helper is_tenant_of_intervention() manquant';
  END IF;

  -- Vérifier que is_assigned_to_intervention() est disponible
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'is_assigned_to_intervention'
  ) THEN
    RAISE NOTICE '✅ Helper is_assigned_to_intervention() disponible';
  ELSE
    RAISE EXCEPTION '❌ ERREUR: Helper is_assigned_to_intervention() manquant';
  END IF;
END $$;

-- ============================================================================
-- NOTES TECHNIQUES
-- ============================================================================
--
-- DIFFÉRENCES vs V3 (20251017150000):
-- ====================================
-- 1. ✅ created_by vérifié EN PREMIER (ligne 109) au lieu de CASE 2 redondant
-- 2. ✅ Utilise get_current_user_id() partout (pas de conversions manuelles)
-- 3. ✅ Pattern IDENTIQUE à intervention_assignments (qui fonctionne)
-- 4. ✅ 2 cases clairs au lieu de 3 cases redondants
-- 5. ✅ TOUTES les policies réécrites (SELECT, INSERT, UPDATE, DELETE)
--
-- PATTERN INTERVENTION_ASSIGNMENTS (RÉFÉRENCE):
-- ==============================================
-- CREATE POLICY "assignments_insert" ON intervention_assignments
-- FOR INSERT
-- WITH CHECK (
--   created_by = get_current_user_id()  -- ✅ OBLIGATOIRE EN PREMIER
--   AND (
--     -- Manager de l'équipe OU autre logique
--   )
-- );
--
-- WORKFLOW CRÉATION QUOTE PAR GESTIONNAIRE:
-- ==========================================
-- 1. Gestionnaire connecté (auth.uid() = fc8bdc26-6fbb-4e64-a83d-f3c5093cde9e)
-- 2. API: POST /intervention_quotes avec:
--    {
--      intervention_id: "...",
--      provider_id: "provider-uuid-123",     // Prestataire sélectionné
--      created_by: "manager-uuid-456",       // Gestionnaire connecté
--      team_id: "...",
--      status: "pending",
--      ...
--    }
-- 3. RLS Policy vérifie:
--    a. created_by = get_current_user_id() ✅ (manager-uuid-456 = manager connecté)
--    b. Gestionnaire est membre de l'équipe de l'intervention ✅
-- 4. INSERT réussit ✅
--
-- WORKFLOW SOUMISSION QUOTE PAR PRESTATAIRE:
-- ===========================================
-- 1. Prestataire connecté (auth.uid() = prestataire-auth-id)
-- 2. API: POST /intervention_quotes avec:
--    {
--      intervention_id: "...",
--      provider_id: "prestataire-uuid-789",  // Son propre ID
--      created_by: "prestataire-uuid-789",   // Même ID
--      team_id: "...",
--      status: "sent",
--      amount: 350,
--      ...
--    }
-- 3. RLS Policy vérifie:
--    a. created_by = get_current_user_id() ✅
--    b. provider_id = get_current_user_id() ✅ (même user)
--    c. User assigné comme prestataire à l'intervention ✅
-- 4. INSERT réussit ✅
--
-- ============================================================================
