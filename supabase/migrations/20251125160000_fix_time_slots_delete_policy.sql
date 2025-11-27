-- ============================================================================
-- FIX: Permettre au prestataire de supprimer ses propres time slots
-- ============================================================================
-- Date: 2025-11-25
-- Problème: La policy time_slots_delete utilise can_manage_intervention()
--           qui ne permet qu'aux gestionnaires/admins de supprimer.
--           Un prestataire ne peut pas supprimer ses propres slots proposés.
--
-- Impact: Quand un prestataire modifie ses disponibilités, l'API fait:
--         1. DELETE des anciens slots (bloqué par RLS!)
--         2. INSERT des nouveaux slots (échoue: duplicate key)
--
-- Solution: Ajouter une condition permettant au proposer de supprimer ses slots.
-- ============================================================================

-- Drop l'ancienne policy
DROP POLICY IF EXISTS "time_slots_delete" ON intervention_time_slots;

-- Créer la nouvelle policy avec permission pour le proposer
CREATE POLICY "time_slots_delete" ON intervention_time_slots
  FOR DELETE
  USING (
    -- Gestionnaire/Admin peut supprimer tous les slots de ses interventions
    can_manage_intervention(intervention_id)
    OR
    -- Le proposer peut supprimer ses propres slots
    proposed_by IN (
      SELECT u.id FROM users u WHERE u.auth_user_id = auth.uid()
    )
  );

COMMENT ON POLICY "time_slots_delete" ON intervention_time_slots IS
  'FIX 2025-11-25: Permet au proposer (prestataire/locataire) de supprimer ses propres slots en plus des gestionnaires';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'intervention_time_slots'
      AND policyname = 'time_slots_delete'
  ) THEN
    RAISE NOTICE '✅ Policy time_slots_delete recréée avec succès';
  ELSE
    RAISE EXCEPTION '❌ Policy time_slots_delete non trouvée après création';
  END IF;
END $$;
