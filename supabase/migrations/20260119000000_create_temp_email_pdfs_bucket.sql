-- Migration: Create temp-email-pdfs bucket for email-to-intervention PDF conversion
-- Date: 2026-01-19
-- Description: Bucket temporaire pour stocker les PDFs générés à partir d'emails
--              Ces PDFs sont attachés aux interventions créées depuis un email
--              Les fichiers sont automatiquement nettoyés après 24h via lifecycle policy

-- Note: Le bucket est créé via l'API dans le code si nécessaire (fallback)
-- Cette migration assure qu'il existe en production

-- Create bucket for temporary email PDFs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'temp-email-pdfs',
  'temp-email-pdfs',
  false,              -- Non public (accès via signed URLs)
  10485760,           -- 10MB max
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policy: Gestionnaires et admins peuvent lire les fichiers temporaires
-- Note: L'upload se fait via service role, donc pas de policy INSERT nécessaire
-- Note: Pas de vérification team_id car fichiers temporaires (<24h) et non sensibles.
--       Le contrôle d'accès réel est fait lors de la génération du PDF (auth check sur email).
CREATE POLICY "gestionnaires_read_temp_pdfs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'temp-email-pdfs'
  AND EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_user_id = auth.uid()
    AND role IN ('gestionnaire', 'admin')
  )
);

-- Policy pour permettre la suppression des fichiers temporaires (cleanup)
CREATE POLICY "service_role_manage_temp_pdfs"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'temp-email-pdfs')
WITH CHECK (bucket_id = 'temp-email-pdfs');

-- Note: Pour le nettoyage automatique des fichiers > 24h,
-- configurer une lifecycle policy dans les Supabase Storage Settings
-- ou créer un cron job qui supprime les fichiers anciens

-- Note: Cannot COMMENT ON storage.buckets (system table, not owned by migration user)
-- Bucket purpose: temp-email-pdfs - PDFs temporaires d'emails pour création d'interventions (24h retention)
