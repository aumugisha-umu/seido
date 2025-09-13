-- =============================================================================
-- SEIDO APP - SCHÉMA INITIAL PROPRE ET SIMPLIFIÉ
-- =============================================================================
-- Date: 13 septembre 2025
-- Version: Architecture simplifiée sans duplication users/contacts
-- Approche: Reset complet + migration initiale intégrant toutes les améliorations

-- =============================================================================
-- EXTENSIONS
-- =============================================================================

-- Extension UUID (optionnelle, PostgreSQL 13+ a gen_random_uuid() natif)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- TYPES ÉNUMÉRÉS
-- =============================================================================

-- Rôles utilisateur (simplifié)
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

-- Types d'intervention
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

-- Types de contact pour les relations (plus large que user_role)
CREATE TYPE contact_type AS ENUM (
    'gestionnaire',
    'locataire',
    'prestataire',
    'syndic',
    'notaire',
    'assurance',
    'proprietaire',
    'autre'
);

-- Types de lots
CREATE TYPE lot_category AS ENUM (
    'appartement',
    'collocation',
    'maison',
    'garage',
    'local_commercial',
    'parking',
    'autre'
);

-- Types pour les notifications
CREATE TYPE notification_type AS ENUM (
    'intervention',
    'payment',
    'document',
    'system',
    'team_invite',
    'assignment',
    'status_change',
    'reminder'
);

CREATE TYPE notification_priority AS ENUM (
    'low',
    'normal',
    'high',
    'urgent'
);

-- Types pour les logs d'activité
CREATE TYPE activity_action_type AS ENUM (
    'create',
    'update',
    'delete',
    'assign',
    'unassign',
    'approve',
    'reject',
    'complete',
    'cancel',
    'upload',
    'download',
    'invite',
    'accept_invite',
    'status_change',
    'login',
    'logout'
);

CREATE TYPE activity_entity_type AS ENUM (
    'user',
    'team',
    'team_member',
    'building',
    'lot',
    'contact',
    'intervention',
    'document',
    'invitation',
    'session'
);

CREATE TYPE activity_status AS ENUM (
    'success',
    'failed',
    'in_progress',
    'cancelled'
);

-- =============================================================================
-- TABLE USERS (UNIFIÉE - REMPLACE users + contacts)
-- =============================================================================

-- Table des utilisateurs (profils complets)
-- Note: Contient les infos de base + métadata auth.users (first_name, last_name, role)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL pour contacts non-authentifiés
    
    -- Informations de base (temporairement maintenues pour compatibilité)
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL, 
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    phone VARCHAR(20),
    
    -- Informations professionnelles (pour prestataires)
    address TEXT,
    company VARCHAR(255),
    speciality intervention_type,
    
    -- Rôle utilisateur (stocké dans users, pas dans auth.users.metadata)
    role user_role NOT NULL DEFAULT 'gestionnaire',
    
    -- Notes et métadonnées
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Système d'équipes (obligatoire)
    team_id UUID, -- Référence ajoutée après création table teams
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- SYSTÈME D'ÉQUIPES 
-- =============================================================================

-- Table des équipes
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des membres d'équipe
CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member', -- 'admin', 'member'
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

-- Ajouter la contrainte team_id maintenant que teams existe
ALTER TABLE users ADD CONSTRAINT fk_users_team 
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL;

-- =============================================================================
-- BÂTIMENTS (ARCHITECTURE SIMPLIFIÉE)
-- =============================================================================

-- Table des bâtiments (SANS manager_id direct)
CREATE TABLE buildings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    postal_code VARCHAR(10) NOT NULL,
    country VARCHAR(2) DEFAULT 'FR', -- Code pays ISO
    
    -- Informations du bâtiment
    description TEXT,
    construction_year INTEGER,
    total_lots INTEGER DEFAULT 0,
    
    -- Équipe gestionnaire (optionnel, relations via building_contacts)
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table de liaison bâtiments-contacts (tous types de contacts)
CREATE TABLE building_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_type contact_type NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Contraintes
    UNIQUE(building_id, user_id, contact_type),
    CHECK(start_date IS NULL OR end_date IS NULL OR end_date > start_date)
);

-- =============================================================================
-- LOTS (ARCHITECTURE SIMPLIFIÉE)  
-- =============================================================================

-- Table des lots (SANS tenant_id direct)
CREATE TABLE lots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    reference VARCHAR(50) NOT NULL,
    
    -- Informations du lot
    floor INTEGER,
    apartment_number VARCHAR(10),
    surface_area DECIMAL(8,2),
    rooms INTEGER,
    category lot_category DEFAULT 'appartement',
    
    -- État d'occupation (calculé automatiquement via lot_contacts)
    is_occupied BOOLEAN DEFAULT FALSE,
    
    -- Informations financières
    rent_amount DECIMAL(10,2),
    charges_amount DECIMAL(10,2),
    
    -- Équipe gestionnaire (héritée du bâtiment ou spécifique)
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Contraintes
    UNIQUE(building_id, reference)
);

-- Table de liaison lots-contacts (tous types de contacts)
CREATE TABLE lot_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lot_id UUID NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_type contact_type NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Contraintes
    UNIQUE(lot_id, user_id, contact_type),
    CHECK(start_date IS NULL OR end_date IS NULL OR end_date > start_date)
);

-- =============================================================================
-- INTERVENTIONS (ARCHITECTURE SIMPLIFIÉE)
-- =============================================================================

-- Table des interventions (SANS assigned_contact_id direct)
CREATE TABLE interventions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference VARCHAR(20) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    type intervention_type NOT NULL,
    urgency intervention_urgency NOT NULL DEFAULT 'normale',
    status intervention_status NOT NULL DEFAULT 'nouvelle_demande',
    
    -- Relations principales (via tables de liaison pour les contacts)
    lot_id UUID REFERENCES lots(id) ON DELETE CASCADE,
    building_id UUID REFERENCES buildings(id) ON DELETE CASCADE, -- Support interventions bâtiment
    tenant_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Demandeur (peut être null pour interventions gestionnaire)
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL, -- Équipe responsable
    
    -- Dates et planification
    requested_date TIMESTAMP WITH TIME ZONE,
    scheduled_date TIMESTAMP WITH TIME ZONE,
    completed_date TIMESTAMP WITH TIME ZONE,
    
    -- Coûts et devis
    estimated_cost DECIMAL(10,2),
    final_cost DECIMAL(10,2),
    requires_quote BOOLEAN DEFAULT FALSE,
    
    -- Planification
    scheduling_type VARCHAR(20) DEFAULT 'flexible', -- 'flexible', 'strict', 'urgent'
    specific_location VARCHAR(255), -- Localisation précise dans le lot/bâtiment
    
    -- Commentaires
    tenant_comment TEXT,
    manager_comment TEXT,
    provider_comment TEXT,
    
    -- Documents
    has_attachments BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Contraintes
    CHECK((lot_id IS NOT NULL) OR (building_id IS NOT NULL)) -- Au moins un des deux
);

-- Table de liaison interventions-contacts (gestionnaires + prestataires)
CREATE TABLE intervention_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intervention_id UUID NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL, -- 'gestionnaire', 'prestataire', 'superviseur'
    is_primary BOOLEAN DEFAULT FALSE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    individual_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Contraintes
    UNIQUE(intervention_id, user_id, role)
);

-- Table des créneaux horaires d'intervention
CREATE TABLE intervention_time_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intervention_id UUID NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,
    slot_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_selected BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Contraintes
    CHECK(end_time > start_time),
    UNIQUE(intervention_id, slot_date, start_time, end_time)
);

-- =============================================================================
-- DOCUMENTS ET STOCKAGE
-- =============================================================================

-- Table des documents d'intervention (structure alignée sur migration existante)
CREATE TABLE intervention_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intervention_id UUID NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,
    
    -- Métadonnées du fichier
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    
    -- Stockage Supabase Storage
    storage_path TEXT NOT NULL,
    storage_bucket TEXT DEFAULT 'intervention-documents',
    
    -- Métadonnées d'upload
    uploaded_by UUID REFERENCES auth.users(id),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Statut et validation
    is_validated BOOLEAN DEFAULT FALSE,
    validated_by UUID REFERENCES auth.users(id),
    validated_at TIMESTAMP WITH TIME ZONE,
    
    -- Catégorisation des documents
    document_type TEXT CHECK (document_type IN (
        'rapport', 
        'photo_avant', 
        'photo_apres', 
        'facture', 
        'devis', 
        'plan', 
        'certificat', 
        'garantie',
        'autre'
    )) DEFAULT 'autre',
    
    -- Description optionnelle
    description TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- NOTIFICATIONS
-- =============================================================================

-- Table des notifications (structure alignée sur migration existante)
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relations
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Contenu de la notification
    type notification_type NOT NULL,
    priority notification_priority DEFAULT 'normal',
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    
    -- Statut
    read BOOLEAN DEFAULT FALSE,
    archived BOOLEAN DEFAULT FALSE,
    
    -- Données additionnelles
    metadata JSONB DEFAULT '{}',
    
    -- Références optionnelles aux entités liées
    related_entity_type TEXT,
    related_entity_id UUID,
    
    -- Champs de traçabilité
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE,
    
    -- Contraintes
    CONSTRAINT valid_related_entity CHECK (
        (related_entity_type IS NULL AND related_entity_id IS NULL) OR
        (related_entity_type IS NOT NULL AND related_entity_id IS NOT NULL)
    )
);

-- =============================================================================
-- INVITATIONS UTILISATEUR
-- =============================================================================

-- Table des invitations utilisateur
CREATE TABLE user_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    invitation_code VARCHAR(50) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Index
    UNIQUE(email, team_id) -- Un email ne peut être invité qu'une fois par équipe active
);

-- =============================================================================
-- LOGS D'ACTIVITÉ
-- =============================================================================

-- Table des logs d'activité (structure alignée sur migration existante)
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Métadonnées de base
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Informations sur l'action
    action_type activity_action_type NOT NULL,
    entity_type activity_entity_type NOT NULL,
    entity_id UUID,
    entity_name TEXT,
    
    -- Statut et description
    status activity_status NOT NULL DEFAULT 'success',
    description TEXT NOT NULL,
    error_message TEXT,
    
    -- Métadonnées additionnelles (JSON flexible)
    metadata JSONB DEFAULT '{}',
    
    -- Informations contextuelles
    ip_address INET,
    user_agent TEXT,
    
    -- Horodatage
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
-- FONCTIONS DE GESTION DES RELATIONS
-- =============================================================================

-- Fonction pour compter les contacts actifs par type
CREATE OR REPLACE FUNCTION count_active_contacts_by_type(
    entity_table TEXT, 
    entity_id UUID, 
    contact_type_param contact_type
)
RETURNS INTEGER AS $$
DECLARE
    result INTEGER;
    query TEXT;
BEGIN
    query := format('
        SELECT COUNT(*)
        FROM %I_contacts 
        WHERE %I_id = $1 
        AND contact_type = $2
        AND (end_date IS NULL OR end_date > CURRENT_DATE)',
        entity_table, entity_table
    );
    
    EXECUTE query INTO result USING entity_id, contact_type_param;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour obtenir le contact principal par type
CREATE OR REPLACE FUNCTION get_primary_contact_by_type(
    entity_table TEXT,
    entity_id UUID, 
    contact_type_param contact_type
)
RETURNS UUID AS $$
DECLARE
    result UUID;
    query TEXT;
BEGIN
    query := format('
        SELECT user_id
        FROM %I_contacts 
        WHERE %I_id = $1 
        AND contact_type = $2
        AND is_primary = TRUE
        AND (end_date IS NULL OR end_date > CURRENT_DATE)
        LIMIT 1',
        entity_table, entity_table
    );
    
    EXECUTE query INTO result USING entity_id, contact_type_param;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TRIGGERS DE SYNCHRONISATION
-- =============================================================================

-- Trigger pour maintenir is_occupied basé sur lot_contacts
CREATE OR REPLACE FUNCTION sync_lot_occupancy()
RETURNS TRIGGER AS $$
DECLARE
    lot_uuid UUID;
    active_tenants_count INTEGER;
    should_process BOOLEAN := FALSE;
BEGIN
    -- Déterminer le lot_id selon l'opération
    IF TG_OP = 'DELETE' THEN
        lot_uuid = OLD.lot_id;
        should_process = (OLD.contact_type = 'locataire');
    ELSE
        lot_uuid = NEW.lot_id;
        should_process = (NEW.contact_type = 'locataire');
    END IF;

    -- Ne traiter que les changements de locataires
    IF should_process THEN
        -- Compter les locataires actifs
        SELECT count_active_contacts_by_type('lot', lot_uuid, 'locataire'::contact_type) 
        INTO active_tenants_count;

        -- Mettre à jour is_occupied
        UPDATE lots 
        SET is_occupied = (active_tenants_count > 0),
            updated_at = NOW()
        WHERE id = lot_uuid;
    END IF;

    -- Retourner selon l'opération
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TRIGGERS UPDATED_AT
-- =============================================================================

-- Appliquer le trigger updated_at sur toutes les tables
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at 
    BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_buildings_updated_at 
    BEFORE UPDATE ON buildings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lots_updated_at 
    BEFORE UPDATE ON lots
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_building_contacts_updated_at 
    BEFORE UPDATE ON building_contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lot_contacts_updated_at 
    BEFORE UPDATE ON lot_contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_interventions_updated_at 
    BEFORE UPDATE ON interventions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_intervention_contacts_updated_at 
    BEFORE UPDATE ON intervention_contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_intervention_documents_updated_at 
    BEFORE UPDATE ON intervention_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_activity_logs_updated_at 
    BEFORE UPDATE ON activity_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Triggers spécifiques
CREATE TRIGGER set_intervention_reference_trigger 
    BEFORE INSERT ON interventions
    FOR EACH ROW EXECUTE FUNCTION set_intervention_reference();

CREATE TRIGGER sync_lot_occupancy_trigger
    AFTER INSERT OR UPDATE OR DELETE ON lot_contacts
    FOR EACH ROW EXECUTE FUNCTION sync_lot_occupancy();

-- =============================================================================
-- INDEX POUR PERFORMANCES
-- =============================================================================

-- Index users
CREATE INDEX idx_users_team ON users(team_id);
CREATE INDEX idx_users_active ON users(is_active);
CREATE INDEX idx_users_speciality ON users(speciality) WHERE speciality IS NOT NULL;

-- Index équipes
CREATE INDEX idx_teams_created_by ON teams(created_by);
CREATE INDEX idx_team_members_team ON team_members(team_id);
CREATE INDEX idx_team_members_user ON team_members(user_id);

-- Index bâtiments
CREATE INDEX idx_buildings_team ON buildings(team_id);
CREATE INDEX idx_buildings_city ON buildings(city);
CREATE INDEX idx_buildings_postal_code ON buildings(postal_code);

-- Index building_contacts
CREATE INDEX idx_building_contacts_building ON building_contacts(building_id);
CREATE INDEX idx_building_contacts_user ON building_contacts(user_id);
CREATE INDEX idx_building_contacts_type ON building_contacts(building_id, contact_type);
CREATE INDEX idx_building_contacts_active ON building_contacts(building_id, contact_type) 
    WHERE end_date IS NULL;

-- Index lots
CREATE INDEX idx_lots_building ON lots(building_id);
CREATE INDEX idx_lots_team ON lots(team_id);
CREATE INDEX idx_lots_occupied ON lots(is_occupied);
CREATE INDEX idx_lots_category ON lots(category);

-- Index lot_contacts
CREATE INDEX idx_lot_contacts_lot ON lot_contacts(lot_id);
CREATE INDEX idx_lot_contacts_user ON lot_contacts(user_id);
CREATE INDEX idx_lot_contacts_type ON lot_contacts(lot_id, contact_type);
CREATE INDEX idx_lot_contacts_active ON lot_contacts(lot_id, contact_type) 
    WHERE end_date IS NULL;

-- Index interventions
CREATE INDEX idx_interventions_lot ON interventions(lot_id);
CREATE INDEX idx_interventions_building ON interventions(building_id);
CREATE INDEX idx_interventions_tenant ON interventions(tenant_id);
CREATE INDEX idx_interventions_team ON interventions(team_id);
CREATE INDEX idx_interventions_status ON interventions(status);
CREATE INDEX idx_interventions_type ON interventions(type);
CREATE INDEX idx_interventions_urgency ON interventions(urgency);
CREATE INDEX idx_interventions_reference ON interventions(reference);

-- Index intervention_contacts
CREATE INDEX idx_intervention_contacts_intervention ON intervention_contacts(intervention_id);
CREATE INDEX idx_intervention_contacts_user ON intervention_contacts(user_id);
CREATE INDEX idx_intervention_contacts_role ON intervention_contacts(intervention_id, role);

-- Index notifications (structure complète)
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_team_id ON notifications(team_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_read ON notifications(read) WHERE read = FALSE;
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_priority ON notifications(priority);
CREATE INDEX idx_notifications_related_entity ON notifications(related_entity_type, related_entity_id) 
    WHERE related_entity_type IS NOT NULL;
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read, created_at DESC) WHERE read = FALSE;
CREATE INDEX idx_notifications_team_unread ON notifications(team_id, read, created_at DESC) WHERE read = FALSE;

-- Index invitations
CREATE INDEX idx_invitations_email ON user_invitations(email);
CREATE INDEX idx_invitations_team ON user_invitations(team_id);
CREATE INDEX idx_invitations_pending ON user_invitations(expires_at) 
    WHERE accepted_at IS NULL;

-- Index activity_logs (structure complète)
CREATE INDEX idx_activity_logs_team ON activity_logs(team_id);
CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX idx_activity_logs_action_status ON activity_logs(action_type, status);
CREATE INDEX idx_activity_logs_team_date ON activity_logs(team_id, created_at DESC);
CREATE INDEX idx_activity_logs_user_team_date ON activity_logs(user_id, team_id, created_at DESC);

-- Index intervention_documents
CREATE INDEX idx_intervention_documents_intervention ON intervention_documents(intervention_id);
CREATE INDEX idx_intervention_documents_uploaded_by ON intervention_documents(uploaded_by);
CREATE INDEX idx_intervention_documents_document_type ON intervention_documents(document_type);
CREATE INDEX idx_intervention_documents_uploaded_at ON intervention_documents(uploaded_at);

-- =============================================================================
-- DONNÉES INITIALES
-- =============================================================================

-- Note: L'utilisateur admin sera créé via l'interface d'inscription normale
-- avec les métadonnées dans auth.users:
-- email: 'admin@seido.fr'
-- user_metadata: { first_name: 'Admin', last_name: 'SEIDO', role: 'admin' }
-- Ensuite le profil sera automatiquement créé dans la table users

-- =============================================================================
-- FONCTIONS UTILITAIRES POUR NOTIFICATIONS ET ACTIVITY_LOGS
-- =============================================================================

-- Fonction pour marquer les notifications comme lues
CREATE OR REPLACE FUNCTION mark_notification_as_read(notification_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE notifications
    SET read = TRUE, read_at = NOW()
    WHERE id = notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour marquer toutes les notifications d'un utilisateur comme lues
CREATE OR REPLACE FUNCTION mark_all_notifications_as_read(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE notifications
    SET read = TRUE, read_at = NOW()
    WHERE user_id = p_user_id AND read = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction helper pour créer un log d'activité
CREATE OR REPLACE FUNCTION log_activity(
    p_team_id UUID,
    p_user_id UUID,
    p_action_type activity_action_type,
    p_entity_type activity_entity_type,
    p_entity_id UUID DEFAULT NULL,
    p_entity_name TEXT DEFAULT NULL,
    p_description TEXT DEFAULT '',
    p_status activity_status DEFAULT 'success',
    p_metadata JSONB DEFAULT '{}',
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO activity_logs (
        team_id, user_id, action_type, entity_type, entity_id, entity_name,
        description, status, metadata, ip_address, user_agent
    ) VALUES (
        p_team_id, p_user_id, p_action_type, p_entity_type, p_entity_id, p_entity_name,
        p_description, p_status, p_metadata, p_ip_address, p_user_agent
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- VALIDATION ET RÉSUMÉ
-- =============================================================================

-- =============================================================================
-- CONFIGURATION STORAGE SUPABASE
-- =============================================================================

-- Bucket pour les documents d'intervention
INSERT INTO storage.buckets (id, name, public) 
VALUES ('intervention-documents', 'intervention-documents', false)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- VALIDATION ET RÉSUMÉ
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '=== SCHÉMA SEIDO ARCHITECTURE SIMPLIFIÉE INITIALISÉ ===';
    RAISE NOTICE '✅ Tables créées: users (unifié), teams, buildings, lots, interventions';
    RAISE NOTICE '✅ Relations via tables de liaison: building_contacts, lot_contacts, intervention_contacts';
    RAISE NOTICE '✅ Pas de duplication users/contacts - Architecture propre';
    RAISE NOTICE '✅ Support auth.users avec metadata (first_name, last_name, role)';
    RAISE NOTICE '✅ Système d''équipes complet intégré';
    RAISE NOTICE '✅ Documents, notifications, invitations, logs inclus';
    RAISE NOTICE '✅ Fonctions, triggers, et index optimisés';
    RAISE NOTICE '✅ Données initiales créées';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 Architecture simplifiée prête - pas de migration nécessaire';
    RAISE NOTICE '📋 Prochaine étape: Adapter le code application';
END $$;
