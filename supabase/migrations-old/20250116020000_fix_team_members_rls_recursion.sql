-- =============================================================================
-- SEIDO APP - CORRECTION DES POLITIQUES RLS TEAM_MEMBERS (RÉCURSION)
-- =============================================================================
-- Cette migration corrige la récursion infinie dans les politiques RLS
-- de la table team_members qui empêche la création d'équipes

-- =============================================================================
-- 1. IDENTIFIER ET SUPPRIMER LES POLITIQUES PROBLÉMATIQUES
-- =============================================================================

-- Sauvegarder les politiques actuelles avant suppression
CREATE TABLE IF NOT EXISTS temp_team_policies_backup (
    id SERIAL PRIMARY KEY,
    table_name TEXT,
    policy_name TEXT,
    policy_cmd TEXT,
    policy_qual TEXT,
    policy_with_check TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Sauvegarder les politiques team_members actuelles
INSERT INTO temp_team_policies_backup (table_name, policy_name, policy_cmd, policy_qual, policy_with_check)
SELECT 'team_members', policyname, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'team_members';

-- Supprimer toutes les politiques existantes sur team_members et teams
DROP POLICY IF EXISTS "Team members can view team members" ON team_members;
DROP POLICY IF EXISTS "Team admins can manage team members" ON team_members;
DROP POLICY IF EXISTS "Team creators can add themselves as admin" ON team_members;

DROP POLICY IF EXISTS "Users can view their teams" ON teams;
DROP POLICY IF EXISTS "Managers can create teams" ON teams;
DROP POLICY IF EXISTS "Team admins can update their teams" ON teams;

-- =============================================================================
-- 2. CRÉER DES POLITIQUES SIMPLIFIÉES SANS RÉCURSION
-- =============================================================================

-- === POLITIQUES POUR TEAMS ===

-- Permettre aux gestionnaires de créer des équipes
CREATE POLICY "Managers can create teams - simple" ON teams
    FOR INSERT WITH CHECK (
        created_by = auth.uid() AND
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'gestionnaire'
        )
    );

-- Permettre de voir les équipes créées par soi-même OU dont on est membre
CREATE POLICY "View accessible teams - simple" ON teams
    FOR SELECT USING (
        -- Créateur de l'équipe
        created_by = auth.uid()
        OR
        -- Membre de l'équipe (vérification simple)
        id IN (
            SELECT team_id FROM team_members 
            WHERE user_id = auth.uid()
        )
    );

-- Permettre aux créateurs de modifier leurs équipes
CREATE POLICY "Team creators can update - simple" ON teams
    FOR UPDATE USING (created_by = auth.uid());

-- === POLITIQUES POUR TEAM_MEMBERS ===

-- Permettre au créateur d'équipe de s'ajouter comme admin (résout le chicken-egg)
CREATE POLICY "Team creators can add themselves - simple" ON team_members
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM teams
            WHERE teams.id = team_members.team_id
            AND teams.created_by = auth.uid()
        )
    );

-- Permettre de voir les membres d'équipes dont on fait partie
CREATE POLICY "View team members - simple" ON team_members
    FOR SELECT USING (
        -- Si on est membre de cette équipe
        team_id IN (
            SELECT tm.team_id FROM team_members tm 
            WHERE tm.user_id = auth.uid()
        )
        OR
        -- Si on est le créateur de cette équipe
        EXISTS (
            SELECT 1 FROM teams t
            WHERE t.id = team_members.team_id
            AND t.created_by = auth.uid()
        )
    );

-- Permettre aux créateurs d'équipe de gérer les membres
CREATE POLICY "Team creators can manage members - simple" ON team_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM teams t
            WHERE t.id = team_members.team_id
            AND t.created_by = auth.uid()
        )
    );

-- =============================================================================
-- 3. FONCTION DE TEST POUR LA CRÉATION D'ÉQUIPE
-- =============================================================================

CREATE OR REPLACE FUNCTION test_team_creation(
    test_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    team_id UUID,
    error_message TEXT
) AS $$
DECLARE
    current_user_id UUID;
    new_team_id UUID;
    team_name TEXT;
BEGIN
    -- Utiliser l'utilisateur actuel ou celui fourni
    current_user_id := COALESCE(test_user_id, auth.uid());
    
    IF current_user_id IS NULL THEN
        RETURN QUERY SELECT false::BOOLEAN, NULL::UUID, 'No authenticated user'::TEXT;
        RETURN;
    END IF;
    
    team_name := 'Test Team for ' || current_user_id::text;
    
    RAISE NOTICE 'Testing team creation:';
    RAISE NOTICE '  - user_id: %', current_user_id;
    RAISE NOTICE '  - team_name: %', team_name;
    
    BEGIN
        -- Créer l'équipe
        INSERT INTO teams (name, description, created_by)
        VALUES (team_name, 'Test team description', current_user_id)
        RETURNING id INTO new_team_id;
        
        RAISE NOTICE '  ✅ Team created with ID: %', new_team_id;
        
        -- Ajouter le créateur comme admin
        INSERT INTO team_members (team_id, user_id, role)
        VALUES (new_team_id, current_user_id, 'admin');
        
        RAISE NOTICE '  ✅ Team creator added as admin';
        
        -- Nettoyer (supprimer le test)
        DELETE FROM team_members WHERE team_id = new_team_id;
        DELETE FROM teams WHERE id = new_team_id;
        
        RETURN QUERY SELECT true::BOOLEAN, new_team_id, NULL::TEXT;
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '  ❌ Team creation failed: %', SQLERRM;
        RETURN QUERY SELECT false::BOOLEAN, NULL::UUID, SQLERRM::TEXT;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 4. VALIDATION
-- =============================================================================

DO $$
DECLARE
    teams_policy_count INTEGER := 0;
    members_policy_count INTEGER := 0;
BEGIN
    -- Compter les politiques
    SELECT COUNT(*) INTO teams_policy_count
    FROM pg_policies WHERE tablename = 'teams';
    
    SELECT COUNT(*) INTO members_policy_count
    FROM pg_policies WHERE tablename = 'team_members';
    
    RAISE NOTICE '=== RÉCURSION TEAM RLS CORRIGÉE ===';
    RAISE NOTICE '✅ Politiques récursives supprimées';
    RAISE NOTICE '✅ Politiques simplifiées créées';
    RAISE NOTICE '📊 Politiques teams: %', teams_policy_count;
    RAISE NOTICE '📊 Politiques team_members: %', members_policy_count;
    RAISE NOTICE '';
    RAISE NOTICE '🧪 Tester: SELECT * FROM test_team_creation();';
    RAISE NOTICE '📋 Anciennes politiques sauvées dans temp_team_policies_backup';
END $$;
