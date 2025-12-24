-- ============================================================================
-- HOTFIX Migration: Réparer RLS Cassé + Fix Prestataire Visibility
-- Date: 2025-12-23
-- Description: Corrige la migration 20251223120000 qui a cassé l'accès aux données
--
-- PROBLÈMES CORRIGÉS:
--   1. Fonction inexistante `get_user_id_from_auth()` → utilise `get_current_user_id()`
--   2. Dépendance circulaire via EXISTS auto-référentiel → utilise `is_assigned_to_intervention()`
--   3. Prestataires ne voyaient que leur propre assignment → voient maintenant tous les participants
--
-- RÉSULTAT ATTENDU:
--   - Gestionnaires: voient toutes les interventions de leur équipe
--   - Prestataires: voient TOUS les participants des interventions où ils sont assignés
--   - Locataires: voient TOUS les participants de leurs interventions
--   - Créneaux: visibles selon le mode (single/group/separate)
-- ============================================================================

-- ============================================================================
-- FIX 1: assignments_select
-- ============================================================================
-- AVANT (cassé):
--   EXISTS qui query intervention_assignments depuis sa propre policy
--   → Dépendance circulaire → aucune donnée retournée
--
-- APRÈS (corrigé):
--   Utilise is_assigned_to_intervention() qui est SECURITY DEFINER
--   → Bypass RLS → pas de circularité → fonctionne correctement
-- ============================================================================

DROP POLICY IF EXISTS "assignments_select" ON intervention_assignments;

CREATE POLICY "assignments_select" ON intervention_assignments
FOR SELECT
TO authenticated
USING (
  -- OPTION 1: Gestionnaire de l'équipe de l'intervention
  -- is_manager_of_intervention_team() vérifie via team_id dénormalisé (pas de dépendance)
  is_manager_of_intervention_team(intervention_id)

  OR

  -- OPTION 2: Locataire de l'intervention
  -- is_tenant_of_intervention() est SECURITY DEFINER → bypass RLS
  is_tenant_of_intervention(intervention_id)

  OR

  -- OPTION 3: TOUT utilisateur assigné peut voir TOUS les participants
  -- is_assigned_to_intervention() est SECURITY DEFINER → bypass RLS → pas de circularité
  -- Cela permet aux prestataires de voir les autres participants (gestionnaire, locataire, autres prestataires)
  is_assigned_to_intervention(intervention_id)
);

COMMENT ON POLICY "assignments_select" ON intervention_assignments IS
'HOTFIX 2025-12-23: Permet SELECT si (1) manager équipe OU (2) tenant OU (3) assigné à l''intervention.
Utilise des fonctions SECURITY DEFINER pour éviter les dépendances circulaires RLS.
AMÉLIORATION: Les prestataires peuvent maintenant voir TOUS les participants, pas seulement eux-mêmes.';

-- ============================================================================
-- FIX 2: time_slots_select
-- ============================================================================
-- AVANT (cassé):
--   provider_id = get_user_id_from_auth()  ← FONCTION INEXISTANTE
--
-- APRÈS (corrigé):
--   provider_id = get_current_user_id()  ← FONCTION CORRECTE
-- ============================================================================

DROP POLICY IF EXISTS "time_slots_select" ON intervention_time_slots;

CREATE POLICY "time_slots_select" ON intervention_time_slots
FOR SELECT
TO authenticated
USING (
  -- Condition 1: L'utilisateur peut voir l'intervention
  can_view_intervention(intervention_id)

  AND (
    -- Mode single/group: provider_id est NULL → visible par tous ceux qui peuvent voir l'intervention
    provider_id IS NULL

    OR

    -- Mode separate: visible uniquement par le prestataire spécifique
    -- CORRIGÉ: Utilise get_current_user_id() au lieu de get_user_id_from_auth() (inexistant)
    -- get_current_user_id() convertit auth.uid() → users.id (SECURITY DEFINER)
    provider_id = get_current_user_id()

    OR

    -- Les gestionnaires voient tous les créneaux (pour coordination)
    is_manager_of_intervention_team(intervention_id)
  )
);

COMMENT ON POLICY "time_slots_select" ON intervention_time_slots IS
'HOTFIX 2025-12-23: Contrôle visibilité des créneaux selon le mode multi-provider.
- provider_id NULL (single/group): visible par tous les participants
- provider_id spécifié (separate): visible par ce prestataire + gestionnaires
CORRIGÉ: Utilise get_current_user_id() pour convertir auth.uid() → users.id';

-- ============================================================================
-- VÉRIFICATION
-- ============================================================================

DO $$
DECLARE
  v_assignments_policy_exists BOOLEAN;
  v_time_slots_policy_exists BOOLEAN;
BEGIN
  -- Vérifier que les policies existent
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'intervention_assignments'
      AND policyname = 'assignments_select'
  ) INTO v_assignments_policy_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'intervention_time_slots'
      AND policyname = 'time_slots_select'
  ) INTO v_time_slots_policy_exists;

  IF v_assignments_policy_exists AND v_time_slots_policy_exists THEN
    RAISE NOTICE '✅ HOTFIX appliqué avec succès';
    RAISE NOTICE '   - assignments_select: reconstruite avec is_assigned_to_intervention()';
    RAISE NOTICE '   - time_slots_select: corrigée avec get_current_user_id()';
  ELSE
    RAISE EXCEPTION '❌ ERREUR: Policies manquantes après HOTFIX';
  END IF;
END $$;

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================
--
-- FONCTIONS SECURITY DEFINER UTILISÉES:
-- ────────────────────────────────────────────────────────────────────────────
--
-- 1. is_assigned_to_intervention(intervention_id UUID)
--    Source: 20251017160000_fix_auth_uid_vs_users_id_mismatch.sql
--    Retourne: BOOLEAN
--    Description: Vérifie si l'utilisateur courant (via get_current_user_id())
--                 est assigné à l'intervention (n'importe quel rôle)
--    SECURITY: DEFINER → bypass RLS sur intervention_assignments
--
-- 2. is_tenant_of_intervention(intervention_id UUID)
--    Source: 20251017160000_fix_auth_uid_vs_users_id_mismatch.sql
--    Retourne: BOOLEAN
--    Description: Vérifie si l'utilisateur courant est assigné avec role='locataire'
--    SECURITY: DEFINER → bypass RLS sur intervention_assignments
--
-- 3. is_manager_of_intervention_team(intervention_id UUID)
--    Source: 20251014134531_phase3_interventions_chat_system.sql
--    Retourne: BOOLEAN
--    Description: Vérifie via team_id dénormalisé si l'utilisateur est gestionnaire
--    SECURITY: DEFINER → bypass RLS sur interventions et team_members
--
-- 4. get_current_user_id()
--    Source: 20251017160000_fix_auth_uid_vs_users_id_mismatch.sql
--    Retourne: UUID (users.id)
--    Description: Convertit auth.uid() (auth.users.id) en users.id (public.users.id)
--    SECURITY: DEFINER → bypass RLS sur users
--
-- 5. can_view_intervention(intervention_id UUID)
--    Source: 20251014134531_phase3_interventions_chat_system.sql
--    Retourne: BOOLEAN
--    Description: Combine is_tenant + is_assigned + is_manager
--    SECURITY: DEFINER → via les fonctions appelées
--
-- ============================================================================
