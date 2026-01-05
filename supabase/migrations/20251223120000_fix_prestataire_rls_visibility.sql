-- ============================================================================
-- Migration: Fix Prestataire RLS Visibility
-- Date: 2025-12-23
-- Description: Corriger les policies RLS pour que les prestataires puissent voir:
--   1. TOUS les participants d'une intervention où ils sont assignés
--   2. Les créneaux proposés (correction UUID mismatch)
-- ============================================================================

-- ============================================================================
-- FIX 1: assignments_select - Permettre aux prestataires de voir TOUS les
--        assignments des interventions où ils sont assignés
-- ============================================================================
-- PROBLÈME ACTUEL:
--   Un prestataire ne voit que son propre assignment (user_id = get_user_id_from_auth())
--   mais devrait voir TOUS les participants de l'intervention
--
-- SOLUTION:
--   Ajouter une clause EXISTS qui vérifie si le prestataire est assigné à l'intervention
-- ============================================================================

DROP POLICY IF EXISTS "assignments_select" ON intervention_assignments;

CREATE POLICY "assignments_select" ON intervention_assignments
FOR SELECT
TO authenticated
USING (
  -- Gestionnaire de l'équipe de l'intervention
  is_manager_of_intervention_team(intervention_id)
  OR
  -- Locataire de l'intervention
  is_tenant_of_intervention(intervention_id)
  OR
  -- NOUVEAU: Prestataire assigné à cette intervention (voit TOUS les assignments)
  -- Note: On vérifie si l'utilisateur courant est assigné comme prestataire à cette intervention
  -- Si oui, il peut voir TOUS les autres participants (gestionnaire, autres prestataires, locataire)
  EXISTS (
    SELECT 1 FROM intervention_assignments ia
    WHERE ia.intervention_id = intervention_assignments.intervention_id
      AND ia.user_id = get_user_id_from_auth()
      AND ia.role = 'prestataire'
  )
);

-- ============================================================================
-- FIX 2: time_slots_select - Corriger le mismatch UUID
-- ============================================================================
-- PROBLÈME ACTUEL:
--   La policy compare provider_id = auth.uid()
--   MAIS provider_id stocke users.id (pas auth.users.id)
--   auth.uid() retourne l'UUID de auth.users, pas de public.users
--
-- SOLUTION:
--   Utiliser get_user_id_from_auth() qui retourne public.users.id
-- ============================================================================

DROP POLICY IF EXISTS "time_slots_select" ON intervention_time_slots;

CREATE POLICY "time_slots_select" ON intervention_time_slots
FOR SELECT
TO authenticated
USING (
  -- Vérifier d'abord que l'utilisateur peut voir l'intervention
  can_view_intervention(intervention_id)
  AND (
    -- Mode single/group OU provider_id NULL: visible par tous ceux qui peuvent voir l'intervention
    provider_id IS NULL
    OR
    -- Mode separate: visible uniquement par ce prestataire spécifique
    -- CORRECTION: Utilise get_user_id_from_auth() au lieu de auth.uid()
    provider_id = get_user_id_from_auth()
    OR
    -- Les gestionnaires de l'équipe voient tous les créneaux
    is_manager_of_intervention_team(intervention_id)
  )
);

-- ============================================================================
-- COMMENTAIRES DE DOCUMENTATION
-- ============================================================================

COMMENT ON POLICY "assignments_select" ON intervention_assignments IS
'Permet aux utilisateurs de voir les assignments selon leur rôle:
- Gestionnaires: voient tous les assignments de leurs interventions d''équipe
- Locataires: voient tous les assignments de leurs interventions
- Prestataires: voient TOUS les participants des interventions où ils sont assignés
  (nécessaire pour afficher la liste des participants dans l''UI)';

COMMENT ON POLICY "time_slots_select" ON intervention_time_slots IS
'Contrôle la visibilité des créneaux proposés:
- provider_id NULL ou mode single/group: visible par tous ceux qui peuvent voir l''intervention
- provider_id spécifié (mode separate): visible uniquement par ce prestataire + gestionnaires
- Utilise get_user_id_from_auth() pour comparer avec users.id (pas auth.uid())';
