-- Migration: 20260112100000_create_email_links_table.sql
-- Description: Table de liaison polymorphique entre emails et entités SEIDO
-- Permet de lier un email à plusieurs entités (buildings, lots, contracts, contacts, companies, interventions)

-- 1. Type enum pour les entités liables
CREATE TYPE email_link_entity_type AS ENUM (
    'building',
    'lot',
    'contract',
    'contact',
    'company',
    'intervention'
);

-- 2. Table de liaison polymorphique
CREATE TABLE email_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Lien vers l'email
    email_id UUID NOT NULL REFERENCES emails(id) ON DELETE CASCADE,

    -- Type et ID de l'entité liée (polymorphique)
    entity_type email_link_entity_type NOT NULL,
    entity_id UUID NOT NULL,

    -- Métadonnées
    linked_by UUID REFERENCES users(id) ON DELETE SET NULL,
    linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT,

    -- Team ID dénormalisé pour RLS (synchronisé via trigger)
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

    -- Contrainte d'unicité: un email ne peut être lié qu'une fois à la même entité
    CONSTRAINT unique_email_entity_link UNIQUE(email_id, entity_type, entity_id)
);

-- 3. Index pour les requêtes courantes
CREATE INDEX idx_email_links_email_id ON email_links(email_id);
CREATE INDEX idx_email_links_entity ON email_links(entity_type, entity_id);
CREATE INDEX idx_email_links_team_id ON email_links(team_id);
CREATE INDEX idx_email_links_linked_at ON email_links(linked_at DESC);

-- 4. Trigger pour synchroniser team_id depuis l'email
CREATE OR REPLACE FUNCTION sync_email_link_team_id()
RETURNS TRIGGER AS $$
BEGIN
    SELECT team_id INTO NEW.team_id FROM emails WHERE id = NEW.email_id;
    IF NEW.team_id IS NULL THEN
        RAISE EXCEPTION 'Cannot find team_id for email_id %', NEW.email_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_email_links_team_id
    BEFORE INSERT ON email_links
    FOR EACH ROW
    EXECUTE FUNCTION sync_email_link_team_id();

-- 5. RLS Policies
ALTER TABLE email_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team managers can view email links"
    ON email_links FOR SELECT
    USING (is_team_manager(team_id));

CREATE POLICY "Team managers can create email links"
    ON email_links FOR INSERT
    WITH CHECK (is_team_manager(
        -- Le trigger va remplir team_id, mais on vérifie que l'utilisateur a accès à l'email
        (SELECT team_id FROM emails WHERE id = email_id)
    ));

CREATE POLICY "Team managers can delete email links"
    ON email_links FOR DELETE
    USING (is_team_manager(team_id));

-- 6. Migrer les données existantes des colonnes FK vers la nouvelle table
-- Note: On conserve les anciennes colonnes pour backward compatibility temporaire
DO $$
BEGIN
    -- Migrer les liens building_id existants
    INSERT INTO email_links (email_id, entity_type, entity_id, team_id, linked_at)
    SELECT id, 'building'::email_link_entity_type, building_id, team_id, created_at
    FROM emails
    WHERE building_id IS NOT NULL
    ON CONFLICT (email_id, entity_type, entity_id) DO NOTHING;

    -- Migrer les liens lot_id existants
    INSERT INTO email_links (email_id, entity_type, entity_id, team_id, linked_at)
    SELECT id, 'lot'::email_link_entity_type, lot_id, team_id, created_at
    FROM emails
    WHERE lot_id IS NOT NULL
    ON CONFLICT (email_id, entity_type, entity_id) DO NOTHING;

    -- Migrer les liens intervention_id existants
    INSERT INTO email_links (email_id, entity_type, entity_id, team_id, linked_at)
    SELECT id, 'intervention'::email_link_entity_type, intervention_id, team_id, created_at
    FROM emails
    WHERE intervention_id IS NOT NULL
    ON CONFLICT (email_id, entity_type, entity_id) DO NOTHING;
END $$;

-- 7. Commentaires
COMMENT ON TABLE email_links IS 'Table de liaison polymorphique entre emails et entités (buildings, lots, contacts, contracts, companies, interventions). Permet plusieurs liaisons par email.';
COMMENT ON COLUMN email_links.entity_type IS 'Type d''entité: building, lot, contract, contact, company, intervention';
COMMENT ON COLUMN email_links.entity_id IS 'UUID de l''entité liée (doit exister dans la table correspondante)';
COMMENT ON COLUMN email_links.linked_by IS 'Utilisateur ayant créé le lien (null si migration automatique)';
COMMENT ON COLUMN email_links.notes IS 'Notes optionnelles sur la raison du lien';
COMMENT ON COLUMN email_links.team_id IS 'Team ID dénormalisé depuis l''email pour optimiser RLS';
