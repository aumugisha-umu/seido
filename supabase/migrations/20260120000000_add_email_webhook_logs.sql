-- ============================================================================
-- Migration: Email Webhook Logs Table
-- Date: 2026-01-20
-- Description: Table d'audit pour les webhooks email entrants (Resend Inbound)
-- ============================================================================

-- Table d'audit pour tracer les webhooks reçus
-- Utile pour le debugging, la sécurité, et l'analyse
CREATE TABLE IF NOT EXISTS email_webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identifiant du webhook
  event_type TEXT NOT NULL,               -- 'email.received'
  resend_email_id TEXT NOT NULL,          -- ID de l'email chez Resend

  -- Adresses email
  recipient_address TEXT NOT NULL,         -- L'adresse reply-to ciblée
  sender_address TEXT NOT NULL,            -- L'expéditeur de la réponse

  -- Sujet (peut être NULL si parsing échoue)
  subject TEXT,

  -- Entité liée (si parsée avec succès)
  intervention_id UUID REFERENCES interventions(id) ON DELETE SET NULL,

  -- Utilisateur identifié (si email connu)
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Statut du traitement
  status TEXT NOT NULL CHECK (status IN (
    'processed',           -- Traitement réussi
    'invalid_address',     -- Format reply-to invalide
    'invalid_hash',        -- Hash HMAC invalide (tentative falsification)
    'unknown_intervention', -- Intervention non trouvée
    'error'                -- Erreur technique
  )),

  -- Message d'erreur (si applicable)
  error_message TEXT,

  -- Métriques de performance
  processing_time_ms INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour recherches fréquentes
CREATE INDEX idx_email_webhook_logs_intervention
  ON email_webhook_logs(intervention_id)
  WHERE intervention_id IS NOT NULL;

CREATE INDEX idx_email_webhook_logs_created_at
  ON email_webhook_logs(created_at DESC);

CREATE INDEX idx_email_webhook_logs_status
  ON email_webhook_logs(status);

CREATE INDEX idx_email_webhook_logs_sender
  ON email_webhook_logs(sender_address);

-- Commentaires
COMMENT ON TABLE email_webhook_logs IS
  'Table d''audit pour les webhooks Resend Inbound - réponses email directes aux notifications d''intervention';

COMMENT ON COLUMN email_webhook_logs.status IS
  'Statut du traitement: processed (OK), invalid_address (format reply-to invalide), invalid_hash (falsification détectée), unknown_intervention (intervention supprimée), error (erreur technique)';

COMMENT ON COLUMN email_webhook_logs.processing_time_ms IS
  'Temps de traitement du webhook en millisecondes';

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE email_webhook_logs ENABLE ROW LEVEL SECURITY;

-- Seuls les admins peuvent voir les logs de webhook
CREATE POLICY "Admins can view webhook logs"
  ON email_webhook_logs FOR SELECT
  USING (is_admin());

-- Insertion uniquement via service role (webhook endpoint)
CREATE POLICY "Service role can insert webhook logs"
  ON email_webhook_logs FOR INSERT
  WITH CHECK (true);  -- Contrôlé côté application

-- ============================================================================
-- Cleanup Job (optionnel - pour éviter que la table grossisse trop)
-- ============================================================================

-- Fonction pour nettoyer les logs de plus de 90 jours
CREATE OR REPLACE FUNCTION cleanup_old_webhook_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM email_webhook_logs
  WHERE created_at < NOW() - INTERVAL '90 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Commentaire
COMMENT ON FUNCTION cleanup_old_webhook_logs() IS
  'Supprime les logs de webhook de plus de 90 jours. À appeler via pg_cron ou manuellement.';

-- ============================================================================
-- Ajout du type de notification 'email_reply_received'
-- ============================================================================

-- Vérifier si le type existe déjà et l'ajouter si nécessaire
DO $$
BEGIN
  -- Vérifier si l'enum notification_type existe
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
    -- Ajouter la nouvelle valeur si elle n'existe pas
    IF NOT EXISTS (
      SELECT 1
      FROM pg_enum
      WHERE enumtypid = 'notification_type'::regtype
      AND enumlabel = 'email_reply_received'
    ) THEN
      ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'email_reply_received';
    END IF;
  END IF;
END $$;
