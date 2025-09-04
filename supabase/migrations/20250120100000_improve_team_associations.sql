-- =============================================================================
-- MIGRATION: AMÉLIORATION DES ASSOCIATIONS D'ÉQUIPES
-- =============================================================================
-- Cette migration améliore les associations entre les utilisateurs, équipes et ressources
-- pour garantir que tous les éléments créés par un membre d'équipe soient accessibles
-- aux autres membres de la même équipe.

-- =============================================================================
-- 1. AMÉLIORATION DES FONCTIONS D'ÉQUIPE
-- =============================================================================

-- Fonction pour obtenir automatiquement l'équipe principale d'un utilisateur
CREATE OR REPLACE FUNCTION get_user_primary_team(user_uuid UUID)
RETURNS UUID AS $$
DECLARE
    primary_team_id UUID;
BEGIN
    -- Récupérer la première équipe de l'utilisateur (par date de création)
    SELECT tm.team_id INTO primary_team_id
    FROM team_members tm
    INNER JOIN teams t ON t.id = tm.team_id
    WHERE tm.user_id = user_uuid
    ORDER BY tm.joined_at ASC, t.created_at ASC
    LIMIT 1;
    
    RETURN primary_team_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour s'assurer qu'un utilisateur a une équipe
CREATE OR REPLACE FUNCTION ensure_user_has_team()
RETURNS TRIGGER AS $$
DECLARE
    team_uuid UUID;
    user_name TEXT;
BEGIN
    -- Vérifier si l'utilisateur est gestionnaire et n'a pas encore d'équipe
    IF NEW.role = 'gestionnaire' THEN
        -- Vérifier s'il a déjà une équipe
        SELECT get_user_primary_team(NEW.id) INTO team_uuid;
        
        IF team_uuid IS NULL THEN
            -- Créer une équipe personnelle pour le gestionnaire
            SELECT NEW.name INTO user_name;
            
            INSERT INTO teams (name, description, created_by)
            VALUES (
                'Équipe de ' || user_name,
                'Équipe personnelle de ' || user_name,
                NEW.id
            )
            RETURNING id INTO team_uuid;
            
            -- Ajouter l'utilisateur comme admin de son équipe
            INSERT INTO team_members (team_id, user_id, role)
            VALUES (team_uuid, NEW.id, 'admin');
            
            RAISE NOTICE 'Équipe personnelle créée pour %: %', user_name, team_uuid;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer le trigger sur les nouveaux utilisateurs gestionnaires
DROP TRIGGER IF EXISTS ensure_user_has_team_trigger ON users;
CREATE TRIGGER ensure_user_has_team_trigger
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION ensure_user_has_team();

-- =============================================================================
-- 2. FONCTIONS POUR AUTO-ASSIGNATION D'ÉQUIPE
-- =============================================================================

-- Fonction pour auto-assigner l'équipe lors de la création d'un contact
CREATE OR REPLACE FUNCTION auto_assign_contact_team()
RETURNS TRIGGER AS $$
DECLARE
    creator_team_id UUID;
BEGIN
    -- Si team_id n'est pas spécifié, utiliser l'équipe de l'utilisateur créateur
    IF NEW.team_id IS NULL THEN
        -- Récupérer l'équipe principale de l'utilisateur auth actuel
        SELECT get_user_primary_team(auth.uid()) INTO creator_team_id;
        
        IF creator_team_id IS NOT NULL THEN
            NEW.team_id := creator_team_id;
            RAISE NOTICE 'Contact auto-assigné à l''équipe: %', creator_team_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer le trigger sur les contacts
DROP TRIGGER IF EXISTS auto_assign_contact_team_trigger ON contacts;
CREATE TRIGGER auto_assign_contact_team_trigger
    BEFORE INSERT ON contacts
    FOR EACH ROW
    EXECUTE FUNCTION auto_assign_contact_team();

-- Fonction pour auto-assigner l'équipe lors de la création d'un bâtiment
CREATE OR REPLACE FUNCTION auto_assign_building_team()
RETURNS TRIGGER AS $$
DECLARE
    creator_team_id UUID;
BEGIN
    -- Si team_id n'est pas spécifié, utiliser l'équipe de l'utilisateur créateur
    IF NEW.team_id IS NULL THEN
        -- Récupérer l'équipe principale de l'utilisateur auth actuel
        SELECT get_user_primary_team(auth.uid()) INTO creator_team_id;
        
        IF creator_team_id IS NOT NULL THEN
            NEW.team_id := creator_team_id;
            RAISE NOTICE 'Bâtiment auto-assigné à l''équipe: %', creator_team_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer le trigger sur les bâtiments
DROP TRIGGER IF EXISTS auto_assign_building_team_trigger ON buildings;
CREATE TRIGGER auto_assign_building_team_trigger
    BEFORE INSERT ON buildings
    FOR EACH ROW
    EXECUTE FUNCTION auto_assign_building_team();

-- =============================================================================
-- 3. AMÉLIORATION DES FONCTIONS EXISTANTES
-- =============================================================================

-- Améliorer la fonction get_user_teams pour une meilleure performance
CREATE OR REPLACE FUNCTION get_user_teams_enhanced(user_uuid UUID)
RETURNS TABLE (
    team_id UUID,
    team_name VARCHAR,
    user_role VARCHAR,
    team_description TEXT,
    joined_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.name,
        tm.role,
        t.description,
        tm.joined_at
    FROM teams t
    INNER JOIN team_members tm ON t.id = tm.team_id
    WHERE tm.user_id = user_uuid
    ORDER BY tm.joined_at ASC, t.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 4. MISE À JOUR DES DONNÉES EXISTANTES
-- =============================================================================

-- Mettre à jour les contacts existants sans équipe
DO $$
DECLARE
    contact_record RECORD;
    user_team_id UUID;
BEGIN
    -- Pour chaque contact sans équipe, essayer de l'assigner à une équipe
    FOR contact_record IN 
        SELECT * FROM contacts WHERE team_id IS NULL
    LOOP
        -- Chercher un gestionnaire qui pourrait "posséder" ce contact
        -- (logique simple : premier gestionnaire trouvé)
        SELECT get_user_primary_team(u.id) INTO user_team_id
        FROM users u 
        WHERE u.role = 'gestionnaire'
        LIMIT 1;
        
        IF user_team_id IS NOT NULL THEN
            UPDATE contacts 
            SET team_id = user_team_id 
            WHERE id = contact_record.id;
            
            RAISE NOTICE 'Contact % assigné à l''équipe %', contact_record.name, user_team_id;
        END IF;
    END LOOP;
END $$;

-- Mettre à jour les bâtiments existants sans équipe
DO $$
DECLARE
    building_record RECORD;
    manager_team_id UUID;
BEGIN
    -- Pour chaque bâtiment sans équipe, l'assigner à l'équipe du manager
    FOR building_record IN 
        SELECT * FROM buildings WHERE team_id IS NULL AND manager_id IS NOT NULL
    LOOP
        SELECT get_user_primary_team(building_record.manager_id) INTO manager_team_id;
        
        IF manager_team_id IS NOT NULL THEN
            UPDATE buildings 
            SET team_id = manager_team_id 
            WHERE id = building_record.id;
            
            RAISE NOTICE 'Bâtiment % assigné à l''équipe %', building_record.name, manager_team_id;
        END IF;
    END LOOP;
END $$;

-- =============================================================================
-- 5. VALIDATION ET VÉRIFICATIONS
-- =============================================================================

DO $$
DECLARE
    contacts_without_team INTEGER;
    buildings_without_team INTEGER;
    users_without_team INTEGER;
BEGIN
    -- Compter les éléments sans équipe
    SELECT COUNT(*) INTO contacts_without_team FROM contacts WHERE team_id IS NULL;
    SELECT COUNT(*) INTO buildings_without_team FROM buildings WHERE team_id IS NULL;
    SELECT COUNT(*) INTO users_without_team FROM users u 
    WHERE u.role = 'gestionnaire' AND get_user_primary_team(u.id) IS NULL;
    
    RAISE NOTICE '=== VALIDATION POST-MIGRATION ===';
    RAISE NOTICE 'Contacts sans équipe: %', contacts_without_team;
    RAISE NOTICE 'Bâtiments sans équipe: %', buildings_without_team;
    RAISE NOTICE 'Gestionnaires sans équipe: %', users_without_team;
    RAISE NOTICE '';
    
    IF contacts_without_team = 0 AND buildings_without_team = 0 AND users_without_team = 0 THEN
        RAISE NOTICE '✅ Tous les éléments sont correctement associés aux équipes';
    ELSE
        RAISE NOTICE '⚠️ Certains éléments restent sans équipe - vérification manuelle recommandée';
    END IF;
END $$;

-- =============================================================================
-- 6. MESSAGES DE VALIDATION FINALE
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '=== MIGRATION AMÉLIORATION ÉQUIPES TERMINÉE ===';
    RAISE NOTICE '✅ Fonctions d''auto-assignation créées';
    RAISE NOTICE '✅ Triggers d''association automatique activés';
    RAISE NOTICE '✅ Données existantes mises à jour';
    RAISE NOTICE '✅ Fonctions utilitaires améliorées';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 Les nouveaux contacts et bâtiments seront automatiquement';
    RAISE NOTICE '   assignés à l''équipe de leur créateur';
END $$;
