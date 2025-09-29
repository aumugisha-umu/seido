-- =============================================================================
-- SCRIPT TEMPORAIRE : DÉSACTIVER TOUS LES RLS POUR TESTS
-- =============================================================================
-- ⚠️ ATTENTION: Ce script désactive TOUS les RLS pour permettre les tests
-- ⚠️ À UTILISER UNIQUEMENT EN DÉVELOPPEMENT
-- ⚠️ REMETTRE LES RLS EN PRODUCTION

-- 1. Désactiver RLS sur la table storage.objects (système Supabase)
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- 2. Désactiver RLS sur notre table intervention_documents
ALTER TABLE intervention_documents DISABLE ROW LEVEL SECURITY;

-- 3. Supprimer toutes les politiques existantes sur intervention_documents (si elles existent)
DROP POLICY IF EXISTS "Users can view intervention documents" ON intervention_documents;
DROP POLICY IF EXISTS "Users can upload documents" ON intervention_documents;
DROP POLICY IF EXISTS "Users can update their own documents" ON intervention_documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON intervention_documents;

-- 4. Supprimer les politiques communes sur storage.objects (si elles existent)
-- Note: Ces noms peuvent varier selon la configuration Supabase
DROP POLICY IF EXISTS "Give users access to own folder 1oj01fe_0" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1oj01fe_1" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1oj01fe_2" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1oj01fe_3" ON storage.objects;

-- 5. Afficher le statut RLS des tables concernées
SELECT
    schemaname,
    tablename,
    rowsecurity,
    'storage.objects' as description
FROM pg_tables
LEFT JOIN pg_class ON pg_class.relname = pg_tables.tablename
LEFT JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
WHERE schemaname = 'storage' AND tablename = 'objects'

UNION ALL

SELECT
    schemaname,
    tablename,
    rowsecurity,
    'intervention_documents' as description
FROM pg_tables
LEFT JOIN pg_class ON pg_class.relname = pg_tables.tablename
LEFT JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
WHERE schemaname = 'public' AND tablename = 'intervention_documents';

-- Message de confirmation
SELECT 'RLS désactivé sur storage.objects et intervention_documents pour TESTS UNIQUEMENT' as status;