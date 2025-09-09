-- =============================================================================
-- SUPPORT POUR PLUSIEURS CONTACTS ASSIGNÉS PAR INTERVENTION
-- =============================================================================
-- Cette migration ajoute une table de liaison pour supporter l'assignation
-- de plusieurs contacts (gestionnaires, prestataires) à une intervention

-- =============================================================================
-- EXTENSIONS
-- =============================================================================

-- Utilisation de gen_random_uuid() (fonction native PostgreSQL 13+)
-- au lieu de uuid_generate_v4() pour éviter les problèmes d'extensions

-- =============================================================================
-- 1. CRÉER LA TABLE DE LIAISON INTERVENTION_CONTACTS
-- =============================================================================

-- Table de liaison pour supporter plusieurs contacts assignés par intervention
CREATE TABLE IF NOT EXISTS intervention_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intervention_id UUID NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL, -- 'gestionnaire', 'prestataire', 'other'
    is_primary BOOLEAN DEFAULT FALSE, -- Permet de désigner un contact principal par rôle
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    individual_message TEXT, -- Message spécifique à ce contact
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Contraintes
    UNIQUE(intervention_id, contact_id, role) -- Un contact ne peut pas avoir le même rôle deux fois pour la même intervention
);

-- Index pour les performances
CREATE INDEX idx_intervention_contacts_intervention ON intervention_contacts(intervention_id);
CREATE INDEX idx_intervention_contacts_contact ON intervention_contacts(contact_id);
CREATE INDEX idx_intervention_contacts_role ON intervention_contacts(intervention_id, role);
CREATE INDEX idx_intervention_contacts_primary ON intervention_contacts(intervention_id, role, is_primary) WHERE is_primary = TRUE;

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER trigger_intervention_contacts_updated_at
    BEFORE UPDATE ON intervention_contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 2. CRÉER UNE TABLE POUR LES CRÉNEAUX HORAIRES D'INTERVENTION
-- =============================================================================

-- Table pour stocker les créneaux horaires proposés pour une intervention
CREATE TABLE IF NOT EXISTS intervention_time_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intervention_id UUID NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,
    slot_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_selected BOOLEAN DEFAULT FALSE, -- Le créneau sélectionné par le prestataire/locataire
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Contraintes
    CHECK(end_time > start_time),
    UNIQUE(intervention_id, slot_date, start_time, end_time)
);

-- Index pour les performances
CREATE INDEX idx_intervention_time_slots_intervention ON intervention_time_slots(intervention_id);
CREATE INDEX idx_intervention_time_slots_selected ON intervention_time_slots(intervention_id) WHERE is_selected = TRUE;

-- =============================================================================
-- 3. AJOUTER DES COLONNES SUPPLÉMENTAIRES À LA TABLE INTERVENTIONS
-- =============================================================================

DO $$
BEGIN
    -- Ajouter une colonne pour indiquer si un devis est requis
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'interventions' AND column_name = 'requires_quote') THEN
        ALTER TABLE interventions ADD COLUMN requires_quote BOOLEAN DEFAULT FALSE;
        RAISE NOTICE '✅ Colonne requires_quote ajoutée à la table interventions';
    END IF;

    -- Ajouter une colonne pour le type de planification
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'interventions' AND column_name = 'scheduling_type') THEN
        ALTER TABLE interventions ADD COLUMN scheduling_type VARCHAR(20) DEFAULT 'flexible';
        RAISE NOTICE '✅ Colonne scheduling_type ajoutée à la table interventions';
    END IF;

    -- Ajouter une colonne pour la localisation spécifique
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'interventions' AND column_name = 'specific_location') THEN
        ALTER TABLE interventions ADD COLUMN specific_location VARCHAR(255);
        RAISE NOTICE '✅ Colonne specific_location ajoutée à la table interventions';
    END IF;

    RAISE NOTICE '📋 Mise à jour de la table interventions terminée';
END $$;

-- =============================================================================
-- 4. VALIDATION
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '=== TABLES INTERVENTION_CONTACTS ET TIME_SLOTS CRÉÉES AVEC SUCCÈS ===';
END $$;
