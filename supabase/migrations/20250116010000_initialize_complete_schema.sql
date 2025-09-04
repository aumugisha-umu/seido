-- =============================================================================
-- SEIDO APP - SCHÉMA COMPLET ET FINAL
-- =============================================================================
-- Cette migration initialise complètement la base de données SEIDO
-- avec toutes les tables, fonctions, et améliorations finales

-- =============================================================================
-- EXTENSIONS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- TYPES ÉNUMÉRÉS
-- =============================================================================

-- Type de rôle utilisateur
CREATE TYPE user_role AS ENUM (
    'admin',
    'gestionnaire', 
    'locataire',
    'prestataire'
);

-- Status des interventions
CREATE TYPE intervention_status AS ENUM (
    'nouvelle_demande',
    'en_attente_validation',
    'validee',
    'en_cours',
    'terminee',
    'annulee'
);

-- Urgence des interventions
CREATE TYPE intervention_urgency AS ENUM (
    'basse',
    'normale',
    'haute',
    'urgente'
);

-- Type d'intervention
CREATE TYPE intervention_type AS ENUM (
    'plomberie',
    'electricite',
    'chauffage',
    'serrurerie',
    'peinture',
    'menage',
    'jardinage',
    'autre'
);

-- =============================================================================
-- TABLE USERS
-- =============================================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role user_role NOT NULL DEFAULT 'locataire',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- SYSTÈME D'ÉQUIPES
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
-- BÂTIMENTS ET LOTS
-- =============================================================================

-- Table des bâtiments (avec support équipes)
CREATE TABLE buildings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    postal_code VARCHAR(10) NOT NULL,
    manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    description TEXT,
    construction_year INTEGER,
    total_lots INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des lots/appartements
CREATE TABLE lots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    reference VARCHAR(50) NOT NULL,
    floor INTEGER,
    apartment_number VARCHAR(10),
    surface_area DECIMAL(8,2),
    rooms INTEGER,
    is_occupied BOOLEAN DEFAULT FALSE,
    tenant_id UUID REFERENCES users(id) ON DELETE SET NULL,
    rent_amount DECIMAL(10,2),
    charges_amount DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(building_id, reference)
);

-- =============================================================================
-- CONTACTS ET PRESTATAIRES
-- =============================================================================

-- Table des contacts/prestataires (avec support équipes)
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    company VARCHAR(255),
    speciality intervention_type,
    address TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table de liaison bâtiments-contacts
CREATE TABLE building_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(building_id, contact_id)
);

-- =============================================================================
-- INTERVENTIONS
-- =============================================================================

-- Table des interventions (avec correction assigned_contact_id)
CREATE TABLE interventions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference VARCHAR(20) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    type intervention_type NOT NULL,
    urgency intervention_urgency NOT NULL DEFAULT 'normale',
    status intervention_status NOT NULL DEFAULT 'nouvelle_demande',
    
    -- Relations
    lot_id UUID NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL, -- NOM CORRIGÉ
    
    -- Dates et planification
    requested_date TIMESTAMP WITH TIME ZONE,
    scheduled_date TIMESTAMP WITH TIME ZONE,
    completed_date TIMESTAMP WITH TIME ZONE,
    
    -- Coûts et devis
    estimated_cost DECIMAL(10,2),
    final_cost DECIMAL(10,2),
    
    -- Commentaires
    tenant_comment TEXT,
    manager_comment TEXT,
    contact_comment TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- FONCTIONS SYSTÈME
-- =============================================================================

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour générer une référence d'intervention unique
CREATE OR REPLACE FUNCTION generate_intervention_reference()
RETURNS TEXT AS $$
DECLARE
    new_ref TEXT;
    ref_exists BOOLEAN;
BEGIN
    LOOP
        -- Générer une référence au format INT-YYYYMMDD-XXX
        new_ref := 'INT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                   LPAD(FLOOR(RANDOM() * 1000)::TEXT, 3, '0');
        
        -- Vérifier si la référence existe déjà
        SELECT EXISTS(SELECT 1 FROM interventions WHERE reference = new_ref) INTO ref_exists;
        
        -- Sortir de la boucle si la référence est unique
        EXIT WHEN NOT ref_exists;
    END LOOP;
    
    RETURN new_ref;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour générer automatiquement la référence d'intervention
CREATE OR REPLACE FUNCTION set_intervention_reference()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.reference IS NULL OR NEW.reference = '' THEN
        NEW.reference = generate_intervention_reference();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- FONCTIONS UTILITAIRES ÉQUIPES
-- =============================================================================

-- Fonction pour obtenir les équipes d'un utilisateur
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

-- Fonction pour vérifier si un utilisateur appartient à une équipe
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
-- TRIGGERS UPDATED_AT
-- =============================================================================

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_buildings_updated_at BEFORE UPDATE ON buildings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lots_updated_at BEFORE UPDATE ON lots
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_interventions_updated_at BEFORE UPDATE ON interventions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour référence intervention
CREATE TRIGGER set_intervention_reference_trigger 
    BEFORE INSERT ON interventions
    FOR EACH ROW EXECUTE FUNCTION set_intervention_reference();

-- =============================================================================
-- INDEX POUR PERFORMANCES
-- =============================================================================

-- Index users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Index équipes
CREATE INDEX idx_teams_created_by ON teams(created_by);
CREATE INDEX idx_team_members_team ON team_members(team_id);
CREATE INDEX idx_team_members_user ON team_members(user_id);

-- Index bâtiments
CREATE INDEX idx_buildings_manager ON buildings(manager_id);
CREATE INDEX idx_buildings_team ON buildings(team_id);

-- Index lots
CREATE INDEX idx_lots_building ON lots(building_id);
CREATE INDEX idx_lots_tenant ON lots(tenant_id);

-- Index contacts
CREATE INDEX idx_contacts_team ON contacts(team_id);

-- Index interventions
CREATE INDEX idx_interventions_lot ON interventions(lot_id);
CREATE INDEX idx_interventions_tenant ON interventions(tenant_id);
CREATE INDEX idx_interventions_status ON interventions(status);
CREATE INDEX idx_interventions_reference ON interventions(reference);

-- =============================================================================
-- DONNÉES INITIALES
-- =============================================================================

-- Créer un utilisateur admin par défaut
INSERT INTO users (id, email, name, role) VALUES 
    ('00000000-0000-0000-0000-000000000001', 'admin@seido.fr', 'Admin SEIDO', 'admin')
ON CONFLICT (email) DO NOTHING;

-- =============================================================================
-- VALIDATION
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '=== SCHÉMA SEIDO INITIALISÉ AVEC SUCCÈS ===';
    RAISE NOTICE '✅ Tables créées: users, teams, team_members, buildings, lots, contacts, interventions';
    RAISE NOTICE '✅ Fonctions créées: triggers, utilitaires équipes, génération références';
    RAISE NOTICE '✅ Index optimisés pour les performances';
    RAISE NOTICE '✅ Utilisateur admin par défaut créé';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ RLS NON ACTIVÉ - Sera fait dans la migration suivante';
    RAISE NOTICE '🎯 Prêt pour l''application des politiques de sécurité';
END $$;
