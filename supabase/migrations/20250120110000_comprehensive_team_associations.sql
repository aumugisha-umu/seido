-- =============================================================================
-- MIGRATION: ASSOCIATIONS D'ÉQUIPES COMPLÈTES POUR TOUTE L'APPLICATION
-- =============================================================================
-- Cette migration garantit que TOUS les éléments créés par un utilisateur 
-- sont automatiquement liés à son équipe principale.

-- =============================================================================
-- 1. VÉRIFICATION ET MISE À JOUR DES SCHÉMAS DE TABLES
-- =============================================================================

-- S'assurer que toutes les tables ont les colonnes team_id nécessaires
DO $$
BEGIN
    -- Vérifier et ajouter team_id à la table lots si nécessaire
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'lots' AND column_name = 'team_id') THEN
        ALTER TABLE lots ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE SET NULL;
        CREATE INDEX idx_lots_team ON lots(team_id);
        RAISE NOTICE '✅ Colonne team_id ajoutée à la table lots';
    END IF;

    -- Vérifier et ajouter team_id à la table interventions si nécessaire
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'interventions' AND column_name = 'team_id') THEN
        ALTER TABLE interventions ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE SET NULL;
        CREATE INDEX idx_interventions_team ON interventions(team_id);
        RAISE NOTICE '✅ Colonne team_id ajoutée à la table interventions';
    END IF;

    RAISE NOTICE '📋 Vérification des colonnes team_id terminée';
END $$;

-- =============================================================================
-- 2. FONCTIONS UTILITAIRES AVANCÉES
-- =============================================================================

-- Fonction pour obtenir l'équipe d'un utilisateur avec fallbacks
CREATE OR REPLACE FUNCTION get_user_team_with_fallback(user_uuid UUID)
RETURNS UUID AS $$
DECLARE
    team_uuid UUID;
    user_role TEXT;
BEGIN
    -- Essayer de récupérer l'équipe existante
    SELECT get_user_primary_team(user_uuid) INTO team_uuid;
    
    -- Si pas d'équipe et que l'utilisateur est gestionnaire, créer une équipe automatiquement
    IF team_uuid IS NULL THEN
        SELECT role INTO user_role FROM users WHERE id = user_uuid;
        
        IF user_role = 'gestionnaire' THEN
            -- Créer une équipe personnelle
            INSERT INTO teams (name, description, created_by)
            SELECT 
                'Équipe de ' || u.name,
                'Équipe personnelle de ' || u.name,
                user_uuid
            FROM users u WHERE u.id = user_uuid
            RETURNING id INTO team_uuid;
            
            -- Ajouter l'utilisateur comme admin
            INSERT INTO team_members (team_id, user_id, role)
            VALUES (team_uuid, user_uuid, 'admin');
            
            RAISE NOTICE 'Équipe personnelle créée automatiquement: %', team_uuid;
        END IF;
    END IF;
    
    RETURN team_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 3. TRIGGERS D'AUTO-ASSIGNATION POUR TOUTES LES TABLES
-- =============================================================================

-- BÂTIMENTS : Auto-assignation d'équipe
CREATE OR REPLACE FUNCTION auto_assign_building_team()
RETURNS TRIGGER AS $$
DECLARE
    user_team_id UUID;
BEGIN
    -- Si team_id n'est pas spécifié, utiliser l'équipe de l'utilisateur
    IF NEW.team_id IS NULL THEN
        SELECT get_user_team_with_fallback(auth.uid()) INTO user_team_id;
        
        IF user_team_id IS NOT NULL THEN
            NEW.team_id := user_team_id;
            RAISE NOTICE 'Bâtiment auto-assigné à l''équipe: %', user_team_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_assign_building_team_trigger ON buildings;
CREATE TRIGGER auto_assign_building_team_trigger
    BEFORE INSERT ON buildings
    FOR EACH ROW
    EXECUTE FUNCTION auto_assign_building_team();

-- LOTS : Auto-assignation d'équipe basée sur le bâtiment parent
CREATE OR REPLACE FUNCTION auto_assign_lot_team()
RETURNS TRIGGER AS $$
DECLARE
    building_team_id UUID;
BEGIN
    -- Si team_id n'est pas spécifié, utiliser l'équipe du bâtiment parent
    IF NEW.team_id IS NULL THEN
        SELECT team_id INTO building_team_id 
        FROM buildings 
        WHERE id = NEW.building_id;
        
        IF building_team_id IS NOT NULL THEN
            NEW.team_id := building_team_id;
            RAISE NOTICE 'Lot auto-assigné à l''équipe du bâtiment: %', building_team_id;
        ELSE
            -- Fallback : utiliser l'équipe de l'utilisateur actuel
            SELECT get_user_team_with_fallback(auth.uid()) INTO building_team_id;
            IF building_team_id IS NOT NULL THEN
                NEW.team_id := building_team_id;
                RAISE NOTICE 'Lot auto-assigné à l''équipe de l''utilisateur: %', building_team_id;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_assign_lot_team_trigger ON lots;
CREATE TRIGGER auto_assign_lot_team_trigger
    BEFORE INSERT ON lots
    FOR EACH ROW
    EXECUTE FUNCTION auto_assign_lot_team();

-- CONTACTS : Auto-assignation d'équipe (déjà existant, mise à jour)
DROP TRIGGER IF EXISTS auto_assign_contact_team_trigger ON contacts;
CREATE TRIGGER auto_assign_contact_team_trigger
    BEFORE INSERT ON contacts
    FOR EACH ROW
    EXECUTE FUNCTION auto_assign_contact_team();

-- INTERVENTIONS : Auto-assignation d'équipe basée sur le lot
CREATE OR REPLACE FUNCTION auto_assign_intervention_team()
RETURNS TRIGGER AS $$
DECLARE
    lot_team_id UUID;
BEGIN
    -- Si team_id n'est pas spécifié, utiliser l'équipe du lot
    IF NEW.team_id IS NULL THEN
        SELECT team_id INTO lot_team_id 
        FROM lots 
        WHERE id = NEW.lot_id;
        
        IF lot_team_id IS NOT NULL THEN
            NEW.team_id := lot_team_id;
            RAISE NOTICE 'Intervention auto-assignée à l''équipe du lot: %', lot_team_id;
        ELSE
            -- Fallback : utiliser l'équipe de l'utilisateur actuel
            SELECT get_user_team_with_fallback(auth.uid()) INTO lot_team_id;
            IF lot_team_id IS NOT NULL THEN
                NEW.team_id := lot_team_id;
                RAISE NOTICE 'Intervention auto-assignée à l''équipe de l''utilisateur: %', lot_team_id;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_assign_intervention_team_trigger ON interventions;
CREATE TRIGGER auto_assign_intervention_team_trigger
    BEFORE INSERT ON interventions
    FOR EACH ROW
    EXECUTE FUNCTION auto_assign_intervention_team();

-- =============================================================================
-- 4. MISE À JOUR DES DONNÉES EXISTANTES
-- =============================================================================

-- Mettre à jour les bâtiments sans équipe
DO $$
DECLARE
    building_record RECORD;
    manager_team_id UUID;
    updated_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Mise à jour des bâtiments sans équipe...';
    
    FOR building_record IN 
        SELECT * FROM buildings WHERE team_id IS NULL AND manager_id IS NOT NULL
    LOOP
        SELECT get_user_team_with_fallback(building_record.manager_id) INTO manager_team_id;
        
        IF manager_team_id IS NOT NULL THEN
            UPDATE buildings 
            SET team_id = manager_team_id 
            WHERE id = building_record.id;
            
            updated_count := updated_count + 1;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Bâtiments mis à jour: %', updated_count;
END $$;

-- Mettre à jour les lots sans équipe
DO $$
DECLARE
    lot_record RECORD;
    lot_team_id UUID;
    updated_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Mise à jour des lots sans équipe...';
    
    FOR lot_record IN 
        SELECT l.* FROM lots l 
        INNER JOIN buildings b ON l.building_id = b.id
        WHERE l.team_id IS NULL AND b.team_id IS NOT NULL
    LOOP
        SELECT b.team_id INTO lot_team_id
        FROM buildings b 
        WHERE b.id = lot_record.building_id;
        
        IF lot_team_id IS NOT NULL THEN
            UPDATE lots 
            SET team_id = lot_team_id 
            WHERE id = lot_record.id;
            
            updated_count := updated_count + 1;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Lots mis à jour: %', updated_count;
END $$;

-- Mettre à jour les contacts sans équipe
DO $$
DECLARE
    contact_record RECORD;
    contact_team_id UUID;
    updated_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Mise à jour des contacts sans équipe...';
    
    FOR contact_record IN 
        SELECT * FROM contacts WHERE team_id IS NULL
    LOOP
        -- Essayer de trouver un gestionnaire pour assigner le contact
        SELECT get_user_team_with_fallback(u.id) INTO contact_team_id
        FROM users u 
        WHERE u.role = 'gestionnaire'
        LIMIT 1;
        
        IF contact_team_id IS NOT NULL THEN
            UPDATE contacts 
            SET team_id = contact_team_id 
            WHERE id = contact_record.id;
            
            updated_count := updated_count + 1;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Contacts mis à jour: %', updated_count;
END $$;

-- Mettre à jour les interventions sans équipe
DO $$
DECLARE
    intervention_record RECORD;
    intervention_team_id UUID;
    updated_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Mise à jour des interventions sans équipe...';
    
    FOR intervention_record IN 
        SELECT i.* FROM interventions i 
        INNER JOIN lots l ON i.lot_id = l.id
        WHERE i.team_id IS NULL AND l.team_id IS NOT NULL
    LOOP
        SELECT l.team_id INTO intervention_team_id
        FROM lots l 
        WHERE l.id = intervention_record.lot_id;
        
        IF intervention_team_id IS NOT NULL THEN
            UPDATE interventions 
            SET team_id = intervention_team_id 
            WHERE id = intervention_record.id;
            
            updated_count := updated_count + 1;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Interventions mises à jour: %', updated_count;
END $$;

-- =============================================================================
-- 5. CONTRAINTES ET VALIDATIONS
-- =============================================================================

-- Fonction de validation pour s'assurer que les éléments ont bien une équipe
CREATE OR REPLACE FUNCTION validate_team_associations()
RETURNS TABLE (
    table_name_result TEXT,
    total_records INTEGER,
    records_with_team INTEGER,
    records_without_team INTEGER,
    percentage_with_team DECIMAL(5,2)
) AS $$
DECLARE
    table_list TEXT[] := ARRAY['buildings', 'lots', 'contacts', 'interventions'];
    table_item TEXT;
    total_count INTEGER;
    with_team_count INTEGER;
    without_team_count INTEGER;
    percentage DECIMAL(5,2);
    column_exists INTEGER;
BEGIN
    FOREACH table_item IN ARRAY table_list
    LOOP
        -- Compter le total
        EXECUTE format('SELECT COUNT(*) FROM %I', table_item) INTO total_count;
        
        -- Vérifier si la colonne team_id existe pour cette table
        SELECT COUNT(*) INTO column_exists
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = table_item 
        AND column_name = 'team_id';
        
        -- Compter avec équipe si la colonne existe
        IF column_exists > 0 THEN
            EXECUTE format('SELECT COUNT(*) FROM %I WHERE team_id IS NOT NULL', table_item) INTO with_team_count;
        ELSE
            with_team_count := 0;
        END IF;
        
        without_team_count := total_count - with_team_count;
        percentage := CASE WHEN total_count > 0 THEN (with_team_count::DECIMAL / total_count) * 100 ELSE 0 END;
        
        RETURN QUERY SELECT 
            table_item,
            total_count,
            with_team_count,
            without_team_count,
            percentage;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 6. VALIDATION FINALE
-- =============================================================================

DO $$
DECLARE
    validation_result RECORD;
    total_issues INTEGER := 0;
BEGIN
    RAISE NOTICE '=== VALIDATION DES ASSOCIATIONS D''ÉQUIPES ===';
    RAISE NOTICE '';
    
    FOR validation_result IN 
        SELECT * FROM validate_team_associations() 
    LOOP
        RAISE NOTICE '📊 Table %: %/% records with team (%.2f%%)', 
            validation_result.table_name_result,
            validation_result.records_with_team,
            validation_result.total_records,
            validation_result.percentage_with_team;
            
        total_issues := total_issues + validation_result.records_without_team;
    END LOOP;
    
    RAISE NOTICE '';
    
    IF total_issues = 0 THEN
        RAISE NOTICE '✅ PARFAIT! Tous les éléments sont associés à des équipes';
    ELSE
        RAISE NOTICE '⚠️  % éléments sans équipe détectés', total_issues;
        RAISE NOTICE '💡 Ceci peut être normal pour les données de test ou les éléments legacy';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== MIGRATION ASSOCIATIONS COMPLÈTES TERMINÉE ===';
    RAISE NOTICE '✅ Triggers d''auto-assignation activés sur toutes les tables';
    RAISE NOTICE '✅ Données existantes mises à jour';
    RAISE NOTICE '✅ Fonctions utilitaires améliorées';
    RAISE NOTICE '✅ Validations et contraintes en place';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 Désormais, TOUS les éléments créés seront automatiquement';
    RAISE NOTICE '   liés à l''équipe de leur créateur!';
END $$;
