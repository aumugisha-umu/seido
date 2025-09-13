-- Ajout du champ has_attachments à la table interventions
ALTER TABLE interventions 
ADD COLUMN IF NOT EXISTS has_attachments BOOLEAN DEFAULT false;

-- Index pour améliorer les performances des requêtes avec filtres sur les documents
CREATE INDEX IF NOT EXISTS interventions_has_attachments_idx ON interventions(has_attachments);

-- Commentaire pour documenter le champ
COMMENT ON COLUMN interventions.has_attachments IS 'Indique si cette intervention a des documents attachés';
