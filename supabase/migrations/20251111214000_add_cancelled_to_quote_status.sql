-- ============================================================================
-- Migration: Add 'cancelled' to intervention_quotes status enum
-- Date: 2025-11-11
-- Description: Ajoute 'cancelled' pour permettre l'annulation de demandes de devis
--              'cancelled' = demande annulée par le gestionnaire
-- ============================================================================

-- Modifier la contrainte CHECK pour inclure 'cancelled'
ALTER TABLE public.intervention_quotes
DROP CONSTRAINT IF EXISTS valid_quote_status;

ALTER TABLE public.intervention_quotes
ADD CONSTRAINT valid_quote_status
CHECK (status IN ('draft', 'pending', 'sent', 'accepted', 'rejected', 'expired', 'cancelled'));

COMMENT ON CONSTRAINT valid_quote_status ON public.intervention_quotes IS
'Statuts valides: draft (brouillon), pending (demande manager), sent (envoyé par prestataire), accepted (accepté), rejected (rejeté), expired (expiré), cancelled (annulé)';
