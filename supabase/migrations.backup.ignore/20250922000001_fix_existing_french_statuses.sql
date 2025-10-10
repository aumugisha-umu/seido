-- =============================================================================
-- FIX DES STATUTS FRANÇAIS EXISTANTS
-- =============================================================================
-- Date: 22 septembre 2025
-- Objectif: Convertir les valeurs françaises existantes en valeurs anglaises valides
-- Méthode: Conversion temporaire en TEXT puis retour à l'enum

-- Étape 1: Convertir la colonne status en TEXT temporairement
ALTER TABLE intervention_quotes ALTER COLUMN status TYPE text;

-- Étape 2: Convertir toutes les valeurs françaises vers anglaises
UPDATE intervention_quotes
SET status = 'pending'
WHERE status = 'En attente';

UPDATE intervention_quotes
SET status = 'approved'
WHERE status = 'Accepté' OR status = 'Approuvé';

UPDATE intervention_quotes
SET status = 'rejected'
WHERE status = 'Refusé' OR status = 'Rejeté';

UPDATE intervention_quotes
SET status = 'cancelled'
WHERE status = 'Annulé';

UPDATE intervention_quotes
SET status = 'expired'
WHERE status = 'Expiré';

-- Étape 3: Convertir les valeurs inconnues vers 'pending'
UPDATE intervention_quotes
SET status = 'pending'
WHERE status NOT IN ('pending', 'approved', 'rejected', 'cancelled', 'expired');

-- Étape 4: Remettre la contrainte enum
ALTER TABLE intervention_quotes
ALTER COLUMN status TYPE quote_status USING status::quote_status;

-- Vérification finale: afficher les statuts après conversion
-- SELECT DISTINCT status, COUNT(*) as count
-- FROM intervention_quotes
-- GROUP BY status
-- ORDER BY status;