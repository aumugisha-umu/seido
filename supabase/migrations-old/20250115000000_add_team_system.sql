-- =============================================================================
-- SEIDO APP - Team System Migration
-- =============================================================================
-- Cette migration ajoute le système d'équipes pour les gestionnaires

-- =============================================================================
-- NOUVELLES TABLES POUR LE SYSTÈME D'ÉQUIPES
-- =============================================================================

-- Table des équipes
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des membres d'équipe
CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member', -- 'admin', 'member'
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

-- =============================================================================
-- MODIFIER LES TABLES EXISTANTES POUR SUPPORTER LES ÉQUIPES
-- =============================================================================

-- Ajouter team_id aux bâtiments (garder manager_id pour compatibilité)
ALTER TABLE buildings ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

-- Ajouter team_id aux contacts
ALTER TABLE contacts ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

-- =============================================================================
-- TRIGGERS POUR UPDATED_AT
-- =============================================================================

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- INDEX POUR LES PERFORMANCES
-- =============================================================================

CREATE INDEX idx_teams_created_by ON teams(created_by);
CREATE INDEX idx_team_members_team ON team_members(team_id);
CREATE INDEX idx_team_members_user ON team_members(user_id);
CREATE INDEX idx_buildings_team ON buildings(team_id);
CREATE INDEX idx_contacts_team ON contacts(team_id);

-- =============================================================================
-- FONCTION UTILITAIRE POUR OBTENIR LES ÉQUIPES D'UN UTILISATEUR
-- =============================================================================

CREATE OR REPLACE FUNCTION get_user_teams(user_uuid UUID)
RETURNS TABLE (
    team_id UUID,
    team_name VARCHAR,
    user_role VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.name,
        tm.role
    FROM teams t
    INNER JOIN team_members tm ON t.id = tm.team_id
    WHERE tm.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- FONCTION POUR VÉRIFIER SI UN UTILISATEUR APPARTIENT À UNE ÉQUIPE
-- =============================================================================

CREATE OR REPLACE FUNCTION user_belongs_to_team(user_uuid UUID, team_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM team_members
        WHERE user_id = user_uuid AND team_id = team_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- ACTIVER RLS SUR LES NOUVELLES TABLES
-- =============================================================================

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- POLITIQUES RLS POUR LES ÉQUIPES
-- =============================================================================

-- Les utilisateurs peuvent voir les équipes dont ils sont membres
CREATE POLICY "Users can view their teams" ON teams
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM team_members
            WHERE team_members.team_id = teams.id
            AND team_members.user_id = auth.uid()
        )
    );

-- Les gestionnaires peuvent créer des équipes
CREATE POLICY "Managers can create teams" ON teams
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'gestionnaire'
        )
        AND created_by = auth.uid()
    );

-- Seuls les admins d'équipe peuvent modifier leur équipe
CREATE POLICY "Team admins can update their teams" ON teams
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM team_members
            WHERE team_members.team_id = teams.id
            AND team_members.user_id = auth.uid()
            AND team_members.role = 'admin'
        )
    );

-- Les membres d'équipe peuvent voir les autres membres
CREATE POLICY "Team members can view team members" ON team_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM team_members tm2
            WHERE tm2.team_id = team_members.team_id
            AND tm2.user_id = auth.uid()
        )
    );

-- Seuls les admins d'équipe peuvent ajouter/supprimer des membres
CREATE POLICY "Team admins can manage team members" ON team_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM team_members tm2
            WHERE tm2.team_id = team_members.team_id
            AND tm2.user_id = auth.uid()
            AND tm2.role = 'admin'
        )
    );

-- =============================================================================
-- MISE À JOUR DES POLITIQUES EXISTANTES POUR SUPPORTER LES ÉQUIPES
-- =============================================================================

-- Supprimer les anciennes politiques pour les bâtiments
DROP POLICY IF EXISTS "Managers can view their buildings" ON buildings;
DROP POLICY IF EXISTS "Managers can update their buildings" ON buildings;
DROP POLICY IF EXISTS "Managers can create buildings" ON buildings;

-- Nouvelles politiques pour les bâtiments avec support des équipes
CREATE POLICY "Team members can view team buildings" ON buildings
    FOR SELECT USING (
        -- Accès par équipe
        (team_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM team_members
            WHERE team_members.team_id = buildings.team_id
            AND team_members.user_id = auth.uid()
        ))
        OR
        -- Accès direct (compatibilité)
        (manager_id = auth.uid() AND EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'gestionnaire'
        ))
    );

CREATE POLICY "Team members can update team buildings" ON buildings
    FOR UPDATE USING (
        -- Accès par équipe
        (team_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM team_members
            WHERE team_members.team_id = buildings.team_id
            AND team_members.user_id = auth.uid()
        ))
        OR
        -- Accès direct (compatibilité)
        (manager_id = auth.uid() AND EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'gestionnaire'
        ))
    );

CREATE POLICY "Managers can create team buildings" ON buildings
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'gestionnaire'
        )
        AND (
            -- Soit il assigne à son équipe
            (team_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM team_members
                WHERE team_members.team_id = buildings.team_id
                AND team_members.user_id = auth.uid()
            ))
            OR
            -- Soit il s'assigne directement (compatibilité)
            manager_id = auth.uid()
        )
    );

-- Supprimer les anciennes politiques pour les lots
DROP POLICY IF EXISTS "Managers can view lots in their buildings" ON lots;
DROP POLICY IF EXISTS "Managers can update lots in their buildings" ON lots;
DROP POLICY IF EXISTS "Managers can create lots in their buildings" ON lots;

-- Nouvelles politiques pour les lots avec support des équipes
CREATE POLICY "Team members can view lots in team buildings" ON lots
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM buildings b
            LEFT JOIN team_members tm ON b.team_id = tm.team_id
            WHERE b.id = lots.building_id
            AND (
                -- Accès par équipe
                (b.team_id IS NOT NULL AND tm.user_id = auth.uid())
                OR
                -- Accès direct (compatibilité)
                (b.manager_id = auth.uid() AND EXISTS (
                    SELECT 1 FROM users 
                    WHERE users.id = auth.uid() 
                    AND users.role = 'gestionnaire'
                ))
            )
        )
        OR
        -- Les locataires peuvent voir leur propre lot
        (tenant_id = auth.uid() AND EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'locataire'
        ))
    );

CREATE POLICY "Team members can update lots in team buildings" ON lots
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM buildings b
            LEFT JOIN team_members tm ON b.team_id = tm.team_id
            WHERE b.id = lots.building_id
            AND (
                -- Accès par équipe
                (b.team_id IS NOT NULL AND tm.user_id = auth.uid())
                OR
                -- Accès direct (compatibilité)
                (b.manager_id = auth.uid() AND EXISTS (
                    SELECT 1 FROM users 
                    WHERE users.id = auth.uid() 
                    AND users.role = 'gestionnaire'
                ))
            )
        )
    );

CREATE POLICY "Team members can create lots in team buildings" ON lots
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM buildings b
            LEFT JOIN team_members tm ON b.team_id = tm.team_id
            WHERE b.id = lots.building_id
            AND (
                -- Accès par équipe
                (b.team_id IS NOT NULL AND tm.user_id = auth.uid())
                OR
                -- Accès direct (compatibilité)
                (b.manager_id = auth.uid() AND EXISTS (
                    SELECT 1 FROM users 
                    WHERE users.id = auth.uid() 
                    AND users.role = 'gestionnaire'
                ))
            )
        )
    );

-- Supprimer les anciennes politiques pour les contacts
DROP POLICY IF EXISTS "Managers and admins can view contacts" ON contacts;
DROP POLICY IF EXISTS "Managers and admins can manage contacts" ON contacts;

-- Nouvelles politiques pour les contacts avec support des équipes
CREATE POLICY "Team members and admins can view contacts" ON contacts
    FOR SELECT USING (
        -- Accès admin
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
        OR
        -- Accès par équipe
        (team_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM team_members
            WHERE team_members.team_id = contacts.team_id
            AND team_members.user_id = auth.uid()
        ))
        OR
        -- Accès gestionnaire sans équipe (compatibilité)
        (team_id IS NULL AND EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'gestionnaire'
        ))
    );

CREATE POLICY "Team members and admins can manage contacts" ON contacts
    FOR ALL USING (
        -- Accès admin
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
        OR
        -- Accès par équipe
        (team_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM team_members
            WHERE team_members.team_id = contacts.team_id
            AND team_members.user_id = auth.uid()
        ))
        OR
        -- Accès gestionnaire sans équipe (compatibilité)
        (team_id IS NULL AND EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'gestionnaire'
        ))
    );

-- Supprimer les anciennes politiques pour les interventions des gestionnaires
DROP POLICY IF EXISTS "Managers can view interventions in their buildings" ON interventions;
DROP POLICY IF EXISTS "Managers can update interventions in their buildings" ON interventions;

-- Nouvelles politiques pour les interventions avec support des équipes
CREATE POLICY "Team members can view interventions in team buildings" ON interventions
    FOR SELECT USING (
        -- Autres rôles (locataires, prestataires) gardent leur accès
        (tenant_id = auth.uid() AND EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'locataire'
        ))
        OR
        (assigned_contact_id IN (
            SELECT contacts.id FROM contacts
            WHERE contacts.email = (
                SELECT email FROM users WHERE id = auth.uid()
            )
        ) AND EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'prestataire'
        ))
        OR
        -- Accès gestionnaires par équipe
        EXISTS (
            SELECT 1 FROM buildings b
            INNER JOIN lots l ON l.building_id = b.id
            LEFT JOIN team_members tm ON b.team_id = tm.team_id
            WHERE interventions.lot_id = l.id
            AND (
                -- Accès par équipe
                (b.team_id IS NOT NULL AND tm.user_id = auth.uid())
                OR
                -- Accès direct (compatibilité)
                (b.manager_id = auth.uid() AND EXISTS (
                    SELECT 1 FROM users 
                    WHERE users.id = auth.uid() 
                    AND users.role = 'gestionnaire'
                ))
            )
        )
    );

CREATE POLICY "Team members can update interventions in team buildings" ON interventions
    FOR UPDATE USING (
        -- Les locataires et prestataires gardent leur accès
        (tenant_id = auth.uid() AND EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'locataire'
        ))
        OR
        (assigned_contact_id IN (
            SELECT contacts.id FROM contacts
            WHERE contacts.email = (
                SELECT email FROM users WHERE id = auth.uid()
            )
        ) AND EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'prestataire'
        ))
        OR
        -- Accès gestionnaires par équipe
        EXISTS (
            SELECT 1 FROM buildings b
            INNER JOIN lots l ON l.building_id = b.id
            LEFT JOIN team_members tm ON b.team_id = tm.team_id
            WHERE interventions.lot_id = l.id
            AND (
                -- Accès par équipe
                (b.team_id IS NOT NULL AND tm.user_id = auth.uid())
                OR
                -- Accès direct (compatibilité)
                (b.manager_id = auth.uid() AND EXISTS (
                    SELECT 1 FROM users 
                    WHERE users.id = auth.uid() 
                    AND users.role = 'gestionnaire'
                ))
            )
        )
    );

-- =============================================================================
-- DONNÉES DE TEST
-- =============================================================================

-- Créer une équipe de test si un gestionnaire existe
DO $$
DECLARE
    manager_id UUID;
    team_id UUID;
BEGIN
    -- Chercher un gestionnaire existant ou créer un gestionnaire de test
    SELECT id INTO manager_id FROM users WHERE role = 'gestionnaire' LIMIT 1;
    
    IF manager_id IS NULL THEN
        INSERT INTO users (id, email, name, role) VALUES 
            (uuid_generate_v4(), 'gestionnaire@seido.fr', 'Gestionnaire Test', 'gestionnaire')
        RETURNING id INTO manager_id;
    END IF;
    
    -- Créer une équipe de test
    INSERT INTO teams (name, description, created_by) VALUES 
        ('Équipe Paris Centre', 'Gestion des biens du centre de Paris', manager_id)
    RETURNING id INTO team_id;
    
    -- Ajouter le gestionnaire comme admin de l'équipe
    INSERT INTO team_members (team_id, user_id, role) VALUES 
        (team_id, manager_id, 'admin');
        
    RAISE NOTICE 'Équipe de test créée avec ID: %', team_id;
    RAISE NOTICE 'Gestionnaire ajouté avec ID: %', manager_id;
END $$;

-- =============================================================================
-- VALIDATION
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Système d''équipes installé avec succès !';
    RAISE NOTICE 'Tables créées : teams, team_members';
    RAISE NOTICE 'Colonnes ajoutées : buildings.team_id, contacts.team_id';
    RAISE NOTICE 'Politiques RLS mises à jour pour supporter les équipes';
    RAISE NOTICE 'Fonctions utilitaires : get_user_teams(), user_belongs_to_team()';
END $$;
