-- =============================================================================
-- SEIDO APP - SYSTÈME DE DEMANDES DE DEVIS INDIVIDUELLES
-- =============================================================================
-- Date: 24 septembre 2025
-- Version: Ajout du système de quote_requests individuelles avec disponibilités liées
-- Objectif: Créer des demandes de devis individuelles pour chaque prestataire
--          et lier les disponibilités aux devis spécifiques

-- =============================================================================
-- NOUVEAU TYPE ÉNUMÉRÉ POUR LES STATUTS DE DEMANDE DE DEVIS
-- =============================================================================

-- Statuts pour les demandes de devis individuelles
CREATE TYPE quote_request_status AS ENUM (
    'sent',       -- Demande envoyée au prestataire
    'viewed',     -- Prestataire a consulté la demande
    'responded',  -- Prestataire a soumis un devis
    'expired',    -- Demande expirée (deadline dépassée)
    'cancelled'   -- Demande annulée par le gestionnaire
);

-- =============================================================================
-- TABLE QUOTE_REQUESTS - DEMANDES DE DEVIS INDIVIDUELLES
-- =============================================================================

-- Table pour tracker les demandes de devis individuelles par prestataire
CREATE TABLE quote_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Relations principales
    intervention_id UUID NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Statut et tracking
    status quote_request_status NOT NULL DEFAULT 'sent',

    -- Contenu de la demande
    individual_message TEXT, -- Message personnalisé pour ce prestataire
    deadline TIMESTAMP WITH TIME ZONE, -- Deadline pour répondre

    -- Métadonnées de suivi
    sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    viewed_at TIMESTAMP WITH TIME ZONE,
    responded_at TIMESTAMP WITH TIME ZONE,

    -- Informations contextuelles
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Contraintes
    CONSTRAINT unique_provider_intervention_request UNIQUE(intervention_id, provider_id),
    CONSTRAINT valid_deadline CHECK (deadline IS NULL OR deadline > sent_at)
);

-- =============================================================================
-- MODIFICATION DE LA TABLE USER_AVAILABILITIES
-- =============================================================================

-- Ajouter la colonne quote_id pour lier les disponibilités aux devis spécifiques
ALTER TABLE user_availabilities
ADD COLUMN quote_id UUID REFERENCES intervention_quotes(id) ON DELETE CASCADE;

-- Ajouter également une référence vers quote_request pour traçabilité
ALTER TABLE user_availabilities
ADD COLUMN quote_request_id UUID REFERENCES quote_requests(id) ON DELETE CASCADE;

-- =============================================================================
-- MODIFICATION DE LA TABLE INTERVENTION_QUOTES
-- =============================================================================

-- Ajouter la relation vers la demande de devis originale
ALTER TABLE intervention_quotes
ADD COLUMN quote_request_id UUID REFERENCES quote_requests(id) ON DELETE SET NULL;

-- =============================================================================
-- INDEX POUR PERFORMANCE
-- =============================================================================

-- Index pour quote_requests
CREATE INDEX idx_quote_requests_intervention ON quote_requests(intervention_id);
CREATE INDEX idx_quote_requests_provider ON quote_requests(provider_id);
CREATE INDEX idx_quote_requests_status ON quote_requests(status);
CREATE INDEX idx_quote_requests_deadline ON quote_requests(deadline) WHERE deadline IS NOT NULL;
CREATE INDEX idx_quote_requests_sent_at ON quote_requests(sent_at DESC);
CREATE INDEX idx_quote_requests_provider_status ON quote_requests(provider_id, status);

-- Index pour user_availabilities avec nouvelles colonnes
CREATE INDEX idx_user_availabilities_quote ON user_availabilities(quote_id) WHERE quote_id IS NOT NULL;
CREATE INDEX idx_user_availabilities_quote_request ON user_availabilities(quote_request_id) WHERE quote_request_id IS NOT NULL;

-- Index composé pour performance des requêtes
CREATE INDEX idx_user_availabilities_intervention_quote ON user_availabilities(intervention_id, quote_id);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Trigger pour updated_at sur quote_requests
CREATE TRIGGER update_quote_requests_updated_at
    BEFORE UPDATE ON quote_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Fonction pour mettre à jour automatiquement le statut des quote_requests
CREATE OR REPLACE FUNCTION update_quote_request_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Quand un devis est soumis, marquer la demande comme "responded"
    IF TG_OP = 'INSERT' AND NEW.quote_request_id IS NOT NULL THEN
        UPDATE quote_requests
        SET status = 'responded',
            responded_at = NOW(),
            updated_at = NOW()
        WHERE id = NEW.quote_request_id
        AND status = 'sent';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour le statut automatiquement
CREATE TRIGGER update_quote_request_status_on_quote_submit
    AFTER INSERT ON intervention_quotes
    FOR EACH ROW EXECUTE FUNCTION update_quote_request_status();

-- =============================================================================
-- FONCTIONS UTILITAIRES
-- =============================================================================

-- Fonction pour marquer une demande comme vue
CREATE OR REPLACE FUNCTION mark_quote_request_as_viewed(request_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE quote_requests
    SET status = CASE
        WHEN status = 'sent' THEN 'viewed'::quote_request_status
        ELSE status
    END,
    viewed_at = CASE
        WHEN status = 'sent' THEN NOW()
        ELSE viewed_at
    END,
    updated_at = NOW()
    WHERE id = request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour marquer les demandes expirées
CREATE OR REPLACE FUNCTION expire_old_quote_requests()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE quote_requests
    SET status = 'expired'::quote_request_status,
        updated_at = NOW()
    WHERE status IN ('sent', 'viewed')
    AND deadline IS NOT NULL
    AND deadline < NOW();

    GET DIAGNOSTICS expired_count = ROW_COUNT;
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- POLITIQUES RLS
-- =============================================================================

-- Activer RLS sur la nouvelle table
ALTER TABLE quote_requests ENABLE ROW LEVEL SECURITY;

-- Les prestataires peuvent voir leurs propres demandes
CREATE POLICY "Providers can view their own quote requests"
  ON quote_requests
  FOR SELECT
  TO authenticated
  USING (
    provider_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
    OR
    -- Gestionnaires peuvent voir toutes les demandes de leur équipe
    EXISTS (
      SELECT 1 FROM interventions i
      JOIN team_members tm ON tm.team_id = i.team_id
      JOIN users u ON u.id = tm.user_id
      WHERE i.id = intervention_id
      AND u.auth_user_id = auth.uid()
      AND u.role = 'gestionnaire'
    )
  );

-- Seuls les gestionnaires peuvent créer/modifier les demandes
CREATE POLICY "Managers can manage quote requests for their team"
  ON quote_requests
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM interventions i
      JOIN team_members tm ON tm.team_id = i.team_id
      JOIN users u ON u.id = tm.user_id
      WHERE i.id = intervention_id
      AND u.auth_user_id = auth.uid()
      AND u.role = 'gestionnaire'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM interventions i
      JOIN team_members tm ON tm.team_id = i.team_id
      JOIN users u ON u.id = tm.user_id
      WHERE i.id = intervention_id
      AND u.auth_user_id = auth.uid()
      AND u.role = 'gestionnaire'
    )
  );

-- Permettre aux prestataires de marquer comme vues (via fonction)
CREATE POLICY "Providers can update view status"
  ON quote_requests
  FOR UPDATE
  TO authenticated
  USING (
    provider_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
    AND status IN ('sent', 'viewed')
  )
  WITH CHECK (
    provider_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
    AND status IN ('viewed', 'responded')
  );

-- =============================================================================
-- MIGRATION DES DONNÉES EXISTANTES
-- =============================================================================

-- Créer des quote_requests pour les assignations existantes dans intervention_contacts
INSERT INTO quote_requests (
    intervention_id,
    provider_id,
    status,
    individual_message,
    deadline,
    sent_at,
    responded_at,
    created_by
)
SELECT DISTINCT
    ic.intervention_id,
    ic.user_id as provider_id,
    CASE
        -- Si le prestataire a déjà soumis un devis, marquer comme "responded"
        WHEN EXISTS (
            SELECT 1 FROM intervention_quotes iq
            WHERE iq.intervention_id = ic.intervention_id
            AND iq.provider_id = ic.user_id
        ) THEN 'responded'::quote_request_status
        ELSE 'sent'::quote_request_status
    END as status,
    ic.individual_message,
    i.quote_deadline as deadline,
    ic.assigned_at as sent_at,
    CASE
        -- Si le prestataire a soumis un devis, utiliser la date de soumission
        WHEN EXISTS (
            SELECT 1 FROM intervention_quotes iq
            WHERE iq.intervention_id = ic.intervention_id
            AND iq.provider_id = ic.user_id
        ) THEN (
            SELECT submitted_at FROM intervention_quotes iq2
            WHERE iq2.intervention_id = ic.intervention_id
            AND iq2.provider_id = ic.user_id
            LIMIT 1
        )
        ELSE NULL
    END as responded_at,
    -- Utiliser le gestionnaire principal de l'équipe comme créateur
    (
        SELECT tm.user_id
        FROM team_members tm
        JOIN users u ON u.id = tm.user_id
        WHERE tm.team_id = i.team_id
        AND u.role = 'gestionnaire'
        AND tm.role = 'admin'
        LIMIT 1
    ) as created_by
FROM intervention_contacts ic
JOIN interventions i ON i.id = ic.intervention_id
JOIN users u ON u.id = ic.user_id
WHERE ic.role = 'prestataire'
AND u.role = 'prestataire'
ON CONFLICT (intervention_id, provider_id) DO NOTHING;

-- Lier les devis existants aux nouvelles quote_requests
UPDATE intervention_quotes
SET quote_request_id = (
    SELECT qr.id
    FROM quote_requests qr
    WHERE qr.intervention_id = intervention_quotes.intervention_id
    AND qr.provider_id = intervention_quotes.provider_id
    LIMIT 1
)
WHERE quote_request_id IS NULL;

-- Migrer les disponibilités existantes vers le nouveau système
-- Lier les disponibilités aux devis existants quand possible
UPDATE user_availabilities
SET quote_id = (
    SELECT iq.id
    FROM intervention_quotes iq
    WHERE iq.intervention_id = user_availabilities.intervention_id
    AND iq.provider_id = user_availabilities.user_id
    LIMIT 1
),
quote_request_id = (
    SELECT qr.id
    FROM quote_requests qr
    WHERE qr.intervention_id = user_availabilities.intervention_id
    AND qr.provider_id = user_availabilities.user_id
    LIMIT 1
)
WHERE user_id IN (SELECT id FROM users WHERE role = 'prestataire');

-- =============================================================================
-- VUE UTILITAIRE POUR LES REQUÊTES
-- =============================================================================

-- Vue pour faciliter les requêtes sur les demandes de devis avec informations complètes
CREATE VIEW quote_requests_with_details AS
SELECT
    qr.*,
    i.reference as intervention_reference,
    i.title as intervention_title,
    i.type as intervention_type,
    i.urgency as intervention_urgency,
    p.name as provider_name,
    p.email as provider_email,
    p.speciality as provider_speciality,
    iq.id as quote_id,
    iq.status as quote_status,
    iq.total_amount as quote_amount
FROM quote_requests qr
JOIN interventions i ON i.id = qr.intervention_id
JOIN users p ON p.id = qr.provider_id
LEFT JOIN intervention_quotes iq ON iq.quote_request_id = qr.id;

-- =============================================================================
-- RÉSUMÉ ET VALIDATION
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '=== SYSTÈME DE DEMANDES DE DEVIS INDIVIDUELLES CRÉÉ ===';
    RAISE NOTICE '✅ Table quote_requests créée avec statuts complets';
    RAISE NOTICE '✅ user_availabilities étendue avec quote_id et quote_request_id';
    RAISE NOTICE '✅ intervention_quotes liée aux quote_requests';
    RAISE NOTICE '✅ Migration des données existantes effectuée';
    RAISE NOTICE '✅ Index optimisés pour performance';
    RAISE NOTICE '✅ Triggers automatiques pour les statuts';
    RAISE NOTICE '✅ Politiques RLS configurées';
    RAISE NOTICE '✅ Fonctions utilitaires créées';
    RAISE NOTICE '✅ Vue quote_requests_with_details disponible';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 Prochaine étape: Modifier les APIs pour utiliser le nouveau système';
END $$;