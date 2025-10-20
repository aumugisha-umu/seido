/**
 * Script de configuration du bucket Supabase Storage pour property-documents
 *
 * Usage:
 *   npx tsx scripts/configure-storage-bucket.ts
 *
 * Prérequis:
 *   - Variables d'environnement NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY
 *   - Migration Phase 2 appliquée (tables property_documents)
 *
 * Note: Le partage temporaire avec prestataires sera ajouté en Phase 3
 */

import { createClient } from '@supabase/supabase-js'

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Variables d\'environnement manquantes:')
  console.error('   - NEXT_PUBLIC_SUPABASE_URL')
  console.error('   - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createBucket() {
  console.log('📦 Création du bucket property-documents...')

  const { data, error } = await supabase.storage.createBucket('property-documents', {
    public: false, // Bucket privé, accès via signed URLs
    fileSizeLimit: 10 * 1024 * 1024, // 10 MB
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'application/zip'
    ]
  })

  if (error) {
    if (error.message.includes('already exists')) {
      console.log('ℹ️  Bucket déjà existant, passage à la configuration des policies...')
      return true
    }
    console.error('❌ Erreur lors de la création du bucket:', error)
    return false
  }

  console.log('✅ Bucket créé avec succès:', data)
  return true
}

async function createStoragePolicies() {
  console.log('\n🔒 Configuration des Storage RLS policies...')

  // Note: La création de Storage RLS policies via l'API JavaScript n'est pas directement supportée
  // Il faut utiliser SQL via Supabase Dashboard ou supabase CLI

  console.log('📝 Policies SQL à exécuter manuellement dans Supabase Dashboard:\n')

  const policies = `
-- ============================================================================
-- STORAGE RLS POLICIES: property-documents (Phase 2)
-- ============================================================================
-- Note: Le partage temporaire avec prestataires sera ajouté en Phase 3

-- 1. SELECT: Télécharger un fichier
CREATE POLICY "property_documents_select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'property-documents'
    AND (
      -- Admin: accès total
      EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid() AND users.role = 'admin'
      )
      OR
      -- Gestionnaire de l'équipe: accès aux documents de son équipe
      EXISTS (
        SELECT 1 FROM property_documents pd
        WHERE pd.storage_path = storage.objects.name
          AND pd.deleted_at IS NULL
          AND EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.user_id = auth.uid()
              AND tm.team_id = pd.team_id
              AND tm.role = 'gestionnaire'
          )
      )
      OR
      -- Locataire: accès aux documents de ses lots si visibility = 'locataire'
      EXISTS (
        SELECT 1 FROM property_documents pd
        INNER JOIN lots l ON pd.lot_id = l.id
        WHERE pd.storage_path = storage.objects.name
          AND pd.deleted_at IS NULL
          AND pd.visibility_level = 'locataire'
          AND l.tenant_id = auth.uid()
      )
    )
  );

-- 2. INSERT: Upload un fichier
CREATE POLICY "property_documents_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'property-documents'
    AND (
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
      OR EXISTS (
        SELECT 1 FROM team_members tm
        WHERE tm.user_id = auth.uid() AND tm.role = 'gestionnaire'
      )
    )
  );

-- 3. UPDATE: Modifier un fichier
CREATE POLICY "property_documents_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'property-documents'
    AND (
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
      OR EXISTS (
        SELECT 1 FROM property_documents pd
        WHERE pd.storage_path = storage.objects.name
          AND pd.deleted_at IS NULL
          AND EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.user_id = auth.uid()
              AND tm.team_id = pd.team_id
              AND tm.role = 'gestionnaire'
          )
      )
    )
  );

-- 4. DELETE: Supprimer un fichier
CREATE POLICY "property_documents_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'property-documents'
    AND (
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
      OR EXISTS (
        SELECT 1 FROM property_documents pd
        WHERE pd.storage_path = storage.objects.name
          AND EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.user_id = auth.uid()
              AND tm.team_id = pd.team_id
              AND tm.role = 'gestionnaire'
          )
      )
    )
  );
`

  console.log(policies)

  console.log('\n📋 Instructions:')
  console.log('1. Ouvrir Supabase Dashboard > Storage > Policies')
  console.log('2. Sélectionner le bucket "property-documents"')
  console.log('3. Copier-coller les 4 policies ci-dessus')
  console.log('4. Vérifier que RLS est activé sur le bucket\n')

  return true
}

async function verifyBucketConfiguration() {
  console.log('🔍 Vérification de la configuration du bucket...\n')

  const { data: buckets, error } = await supabase.storage.listBuckets()

  if (error) {
    console.error('❌ Erreur lors de la récupération des buckets:', error)
    return false
  }

  const bucket = buckets?.find(b => b.id === 'property-documents')

  if (!bucket) {
    console.error('❌ Bucket property-documents non trouvé')
    return false
  }

  console.log('✅ Bucket trouvé:')
  console.log('   - ID:', bucket.id)
  console.log('   - Public:', bucket.public ? 'Oui ❌ (devrait être privé)' : 'Non ✅')
  console.log('   - Limite de taille:', bucket.file_size_limit ? `${bucket.file_size_limit / 1024 / 1024} MB` : 'Non définie')
  console.log('   - Types MIME autorisés:', bucket.allowed_mime_types?.length || 0, 'types')

  if (bucket.allowed_mime_types) {
    console.log('\n📄 Types MIME autorisés:')
    bucket.allowed_mime_types.forEach(type => console.log('   -', type))
  }

  return true
}

async function main() {
  console.log('🚀 Configuration du bucket Supabase Storage pour property-documents\n')

  try {
    // 1. Créer le bucket
    const bucketCreated = await createBucket()
    if (!bucketCreated) {
      process.exit(1)
    }

    // 2. Afficher les policies SQL à appliquer manuellement
    await createStoragePolicies()

    // 3. Vérifier la configuration
    await verifyBucketConfiguration()

    console.log('\n✅ Configuration terminée!')
    console.log('\n⚠️  N\'oubliez pas d\'appliquer les Storage RLS policies manuellement!')

  } catch (error) {
    console.error('\n❌ Erreur lors de la configuration:', error)
    process.exit(1)
  }
}

main()
