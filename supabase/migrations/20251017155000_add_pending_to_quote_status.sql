-- ============================================================================
-- Migration: Add 'pending' to intervention_quotes status enum
-- Date: 2025-10-17
-- Description: Ajoute 'pending' pour demandes de devis envoyées par managers
--              'pending' = demande envoyée, en attente de soumission prestataire
-- ============================================================================

-- Modifier la contrainte CHECK pour inclure 'pending'
ALTER TABLE public.intervention_quotes
DROP CONSTRAINT IF EXISTS valid_quote_status;

ALTER TABLE public.intervention_quotes
ADD CONSTRAINT valid_quote_status
CHECK (status IN ('draft', 'pending', 'sent', 'accepted', 'rejected', 'expired'));

COMMENT ON CONSTRAINT valid_quote_status ON public.intervention_quotes IS
'Statuts valides: draft (brouillon), pending (demande manager), sent (envoyé par prestataire), accepted (accepté), rejected (rejeté), expired (expiré)';
