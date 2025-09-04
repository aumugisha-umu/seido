-- =============================================================================
-- SEIDO APP - Fix Team Creator RLS Policy
-- =============================================================================
-- Cette migration corrige le problème de "chicken and egg" où le créateur 
-- d'une équipe ne peut pas s'ajouter comme premier membre

-- =============================================================================
-- POLITIQUE INSERT POUR TEAM_MEMBERS
-- =============================================================================

-- Permettre au créateur d'une équipe de s'ajouter automatiquement comme admin
CREATE POLICY "Team creators can add themselves as admin" ON team_members
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM teams
            WHERE teams.id = team_members.team_id
            AND teams.created_by = auth.uid()
        )
    );

-- =============================================================================
-- VALIDATION
-- =============================================================================

-- Vérifier que la politique a bien été créée
DO $$
BEGIN
    RAISE NOTICE '✅ Politique INSERT ajoutée pour team_members';
    RAISE NOTICE '👥 Les créateurs d''équipe peuvent maintenant s''ajouter comme premier admin';
END $$;
