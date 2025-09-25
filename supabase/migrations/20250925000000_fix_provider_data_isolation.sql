-- Migration: Correction de l'isolation des données prestataires
-- Date: 2025-09-25
-- Description: Empêche les prestataires de voir les devis et disponibilités des autres prestataires
--              Résout le problème critique de confidentialité des données commerciales

-- =============================================================================
-- ÉTAPE 1: ACTIVER RLS SUR LA TABLE intervention_quotes
-- =============================================================================

-- Activer RLS sur intervention_quotes (actuellement pas de protection)
ALTER TABLE intervention_quotes ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- ÉTAPE 2: CRÉER POLITIQUES RLS POUR intervention_quotes
-- =============================================================================

-- Politique principale: Isolation des devis par prestataire
CREATE POLICY "Providers can only access their own quotes"
  ON intervention_quotes
  FOR ALL
  TO authenticated
  USING (
    -- 1. Un prestataire peut uniquement voir ses propres devis
    provider_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND role = 'prestataire')
    OR
    -- 2. Gestionnaires peuvent voir tous les devis des interventions de leur équipe
    EXISTS (
      SELECT 1 FROM interventions i
      JOIN team_members tm ON tm.team_id = i.team_id
      JOIN users u ON u.id = tm.user_id
      WHERE i.id = intervention_id
      AND u.auth_user_id = auth.uid()
      AND u.role = 'gestionnaire'
    )
    OR
    -- 3. Locataires peuvent voir les devis des interventions qui les concernent
    EXISTS (
      SELECT 1 FROM interventions i
      LEFT JOIN lot_contacts lc ON lc.lot_id = i.lot_id
      JOIN users cu ON cu.auth_user_id = auth.uid()
      WHERE i.id = intervention_id
      AND cu.role = 'locataire'
      AND (
        -- L'intervention concerne un lot où le locataire est assigné
        lc.user_id = cu.id
        OR
        -- L'intervention concerne un bâtiment où le locataire a des lots
        (i.building_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM lots l
          JOIN lot_contacts lc2 ON lc2.lot_id = l.id
          WHERE l.building_id = i.building_id
          AND lc2.user_id = cu.id
        ))
        OR
        -- Le locataire est le demandeur de l'intervention
        i.tenant_id = cu.id
      )
    )
    OR
    -- 4. Admins peuvent tout voir
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.role = 'admin'
    )
  )
  WITH CHECK (
    -- Pour les insertions/updates: les prestataires ne peuvent gérer que leurs propres devis
    provider_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND role = 'prestataire')
    OR
    -- Gestionnaires peuvent créer/modifier des devis pour les interventions de leur équipe
    EXISTS (
      SELECT 1 FROM interventions i
      JOIN team_members tm ON tm.team_id = i.team_id
      JOIN users u ON u.id = tm.user_id
      WHERE i.id = intervention_id
      AND u.auth_user_id = auth.uid()
      AND u.role = 'gestionnaire'
    )
    OR
    -- Admins peuvent tout faire
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.role = 'admin'
    )
  );

-- =============================================================================
-- ÉTAPE 3: CORRIGER LA POLITIQUE user_availabilities POUR PLUS DE RESTRICTION
-- =============================================================================

-- Supprimer l'ancienne politique trop permissive
DROP POLICY IF EXISTS "Users can view relevant availabilities" ON user_availabilities;

-- Créer une nouvelle politique avec isolation des prestataires
CREATE POLICY "Role-based availability access with provider isolation"
  ON user_availabilities
  FOR ALL
  TO authenticated
  USING (
    -- 1. Un utilisateur peut toujours gérer ses propres disponibilités
    user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
    OR
    -- 2. Gestionnaires peuvent voir toutes les disponibilités des interventions de leur équipe
    EXISTS (
      SELECT 1 FROM interventions i
      JOIN team_members tm ON tm.team_id = i.team_id
      JOIN users u ON u.id = tm.user_id
      WHERE i.id = intervention_id
      AND u.auth_user_id = auth.uid()
      AND u.role = 'gestionnaire'
    )
    OR
    -- 3. Locataires peuvent voir les disponibilités des gestionnaires et prestataires assignés
    --    mais PAS des autres prestataires non-assignés
    (EXISTS (
      SELECT 1 FROM interventions i
      LEFT JOIN lot_contacts lc ON lc.lot_id = i.lot_id
      JOIN users cu ON cu.auth_user_id = auth.uid()
      WHERE i.id = intervention_id
      AND cu.role = 'locataire'
      AND (
        -- L'intervention concerne un lot où le locataire est assigné
        lc.user_id = cu.id
        OR
        -- L'intervention concerne un bâtiment où le locataire a des lots
        (i.building_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM lots l
          JOIN lot_contacts lc2 ON lc2.lot_id = l.id
          WHERE l.building_id = i.building_id
          AND lc2.user_id = cu.id
        ))
        OR
        -- Le locataire est le demandeur de l'intervention
        i.tenant_id = cu.id
      )
    ) AND (
      -- ET l'utilisateur dont on veut voir la disponibilité est soit:
      -- - Un gestionnaire de l'équipe responsable
      EXISTS (
        SELECT 1 FROM interventions i2
        JOIN team_members tm2 ON tm2.team_id = i2.team_id
        JOIN users u2 ON u2.id = tm2.user_id
        WHERE i2.id = intervention_id
        AND u2.id = user_id
        AND u2.role = 'gestionnaire'
      )
      OR
      -- - Un prestataire assigné à cette intervention
      EXISTS (
        SELECT 1 FROM intervention_contacts ic
        JOIN users u2 ON u2.id = ic.user_id
        WHERE ic.intervention_id = intervention_id
        AND ic.user_id = user_id
        AND u2.role = 'prestataire'
      )
      OR
      -- - Un autre locataire concerné par l'intervention
      EXISTS (
        SELECT 1 FROM users u2
        WHERE u2.id = user_id
        AND u2.role = 'locataire'
      )
    ))
    OR
    -- 4. Prestataires peuvent SEULEMENT voir:
    --    - Leurs propres disponibilités (déjà couvert par le premier cas)
    --    - Les disponibilités des gestionnaires et locataires pour les interventions assignées
    --    - MAIS PAS les disponibilités des autres prestataires
    (EXISTS (
      SELECT 1 FROM intervention_contacts ic
      JOIN users cu ON cu.auth_user_id = auth.uid()
      WHERE ic.intervention_id = intervention_id
      AND ic.user_id = cu.id
      AND cu.role = 'prestataire'
    ) AND (
      -- ET l'utilisateur dont on veut voir la disponibilité est soit:
      -- - Un gestionnaire
      EXISTS (
        SELECT 1 FROM users u2
        WHERE u2.id = user_id
        AND u2.role IN ('gestionnaire', 'locataire')
      )
      -- MAIS PAS un autre prestataire (pas de OR ici!)
    ))
    OR
    -- 5. Admins peuvent tout voir
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.role = 'admin'
    )
  )
  WITH CHECK (
    -- Pour les insertions/updates: même logique mais focus sur la modification
    user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM interventions i
      JOIN team_members tm ON tm.team_id = i.team_id
      JOIN users u ON u.id = tm.user_id
      WHERE i.id = intervention_id
      AND u.auth_user_id = auth.uid()
      AND u.role = 'gestionnaire'
    )
    OR
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.role = 'admin'
    )
  );

-- =============================================================================
-- COMMENTAIRES EXPLICATIFS
-- =============================================================================

COMMENT ON POLICY "Providers can only access their own quotes" ON intervention_quotes IS
'SÉCURITÉ CRITIQUE: Isolation des devis entre prestataires
- Prestataires: uniquement leurs propres devis
- Gestionnaires: tous les devis de leur équipe
- Locataires: devis pour leurs interventions
- Admins: accès complet';

COMMENT ON POLICY "Role-based availability access with provider isolation" ON user_availabilities IS
'SÉCURITÉ CRITIQUE: Isolation des disponibilités entre prestataires
- Prestataires voient: leurs disponibilités + gestionnaires/locataires des interventions assignées
- PAS de visibilité sur les autres prestataires
- Gestionnaires: toutes disponibilités de leur équipe
- Locataires: disponibilités des participants autorisés à leurs interventions';

-- =============================================================================
-- VALIDATION ET RÉSUMÉ
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '=== CORRECTION ISOLATION DONNÉES PRESTATAIRES ===';
    RAISE NOTICE '✅ RLS activé sur intervention_quotes';
    RAISE NOTICE '✅ Politique créée: isolation des devis par prestataire';
    RAISE NOTICE '✅ Politique corrigée: isolation des disponibilités entre prestataires';
    RAISE NOTICE '⚠️  CRITIQUE: Les prestataires ne peuvent plus voir les données des concurrents';
    RAISE NOTICE '📋 Prochaine étape: Modifier le service backend pour respecter ces politiques';
END $$;