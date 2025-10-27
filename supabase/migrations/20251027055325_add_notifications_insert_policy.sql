-- ============================================================================
-- Migration: Remove notifications INSERT policy (if exists)
-- Date: 2025-10-27
-- Description: Supprime la politique INSERT pour notifications si elle existe.
--              L'API /api/notifications utilise maintenant le service_role client
--              qui bypass RLS pour permettre la creation de notifications pour
--              n'importe quel utilisateur (gestionnaire -> locataire, etc.)
-- Impact: Pas d'impact (l'API est securisee par getApiAuthContext)
-- ============================================================================

-- Supprimer la politique INSERT si elle existe
DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;

COMMENT ON TABLE public.notifications IS
'Table des notifications. INSERT via service_role uniquement (API /api/notifications). SELECT/UPDATE/DELETE proteges par RLS.';

-- ============================================================================
-- FIN DE LA MIGRATION
-- ============================================================================
