-- Migration: Correction de l'accès aux disponibilités pour les locataires
-- Date: 2025-09-22
-- Description: Permet aux locataires de voir les disponibilités des prestataires et gestionnaires 
--              pour les interventions qui les concernent

-- Supprimer l'ancienne politique restrictive
DROP POLICY IF EXISTS "Users can manage their own availabilities" ON user_availabilities;

-- Créer une nouvelle politique plus inclusive
CREATE POLICY "Users can view relevant availabilities"
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
    -- 3. NOUVEAU: Locataires peuvent voir les disponibilités des autres participants
    --    pour leurs propres interventions (prestataires, gestionnaires, autres locataires)
    EXISTS (
      SELECT 1 FROM interventions i
      LEFT JOIN lot_contacts lc ON lc.lot_id = i.lot_id
      JOIN users cu ON cu.auth_user_id = auth.uid()
      WHERE i.id = intervention_id
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
        -- Le locataire est directement assigné à l'intervention via intervention_contacts
        EXISTS (
          SELECT 1 FROM intervention_contacts ic
          WHERE ic.intervention_id = i.id
          AND ic.user_id = cu.id
        )
      )
    )
    OR
    -- 4. Prestataires peuvent voir les disponibilités pour les interventions qui leur sont assignées
    EXISTS (
      SELECT 1 FROM intervention_contacts ic
      JOIN users cu ON cu.auth_user_id = auth.uid()
      WHERE ic.intervention_id = intervention_id
      AND ic.user_id = cu.id
      AND cu.role = 'prestataire'
    )
  );

-- Ajouter un commentaire explicatif
COMMENT ON POLICY "Users can view relevant availabilities" ON user_availabilities IS 
'Permet aux utilisateurs de voir les disponibilités selon leur rôle:
- Ses propres disponibilités (tous)
- Toutes les disponibilités de l''équipe (gestionnaires) 
- Disponibilités des participants à ses interventions (locataires)
- Disponibilités des interventions assignées (prestataires)';
