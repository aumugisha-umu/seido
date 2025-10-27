-- Migration: Créer la table push_subscriptions pour les notifications push PWA
-- Description: Stocke les abonnements push des utilisateurs (un par appareil)

-- Table push_subscriptions
CREATE TABLE push_subscriptions (
  -- Identifiant
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Relations
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Données d'abonnement Push
  endpoint TEXT NOT NULL UNIQUE,
  keys JSONB NOT NULL, -- {p256dh: string, auth: string}

  -- Métadonnées
  user_agent TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour optimiser les requêtes par user_id
CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);

-- Index pour optimiser les recherches par endpoint
CREATE INDEX idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_push_subscriptions_updated_at
BEFORE UPDATE ON push_subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy : Les utilisateurs peuvent voir leurs propres abonnements
CREATE POLICY "Users can view own push subscriptions"
  ON push_subscriptions
  FOR SELECT
  USING (user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- Policy : Les utilisateurs peuvent créer leurs propres abonnements
CREATE POLICY "Users can create own push subscriptions"
  ON push_subscriptions
  FOR INSERT
  WITH CHECK (user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- Policy : Les utilisateurs peuvent mettre à jour leurs propres abonnements
CREATE POLICY "Users can update own push subscriptions"
  ON push_subscriptions
  FOR UPDATE
  USING (user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()))
  WITH CHECK (user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- Policy : Les utilisateurs peuvent supprimer leurs propres abonnements
CREATE POLICY "Users can delete own push subscriptions"
  ON push_subscriptions
  FOR DELETE
  USING (user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- Commentaires pour la documentation
COMMENT ON TABLE push_subscriptions IS
  'Stocke les abonnements push des utilisateurs pour les notifications PWA (un abonnement par appareil)';

COMMENT ON COLUMN push_subscriptions.endpoint IS
  'URL unique du service de push (fournie par le navigateur)';

COMMENT ON COLUMN push_subscriptions.keys IS
  'Clés de chiffrement pour les notifications push (p256dh et auth)';

COMMENT ON COLUMN push_subscriptions.user_agent IS
  'User agent de l''appareil (pour identifier le type d''appareil)';
