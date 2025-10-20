import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'
import { logger } from '@/lib/logger'
import { createPropertyDocumentService, createStorageService } from '@/lib/services'

/**
 * POST /api/property-documents/upload
 * Upload un document property avec le fichier
 *
 * Body: FormData
 * - file: File (requis)
 * - document_type: string (requis)
 * - team_id: string (requis)
 * - building_id: string (optionnel, mutuellement exclusif avec lot_id)
 * - lot_id: string (optionnel, mutuellement exclusif avec building_id)
 * - visibility_level: 'equipe' | 'locataire' (optionnel, défaut: 'equipe')
 * - title: string (optionnel)
 * - description: string (optionnel)
 * - expiry_date: string (optionnel, ISO date)
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Ignore cookie setting errors in API routes
            }
          },
        },
      }
    )

    // Vérifier l'authentification
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    if (authError || !authUser) {
      return NextResponse.json({
        success: false,
        error: 'Non autorisé'
      }, { status: 401 })
    }

    // Récupérer le profil utilisateur
    const { data: userProfile } = await supabase
      .from('users')
      .select('id, role, team_id')
      .eq('auth_user_id', authUser.id)
      .single()

    if (!userProfile) {
      return NextResponse.json({
        success: false,
        error: 'Profil utilisateur introuvable'
      }, { status: 404 })
    }

    // Vérifier les permissions (gestionnaires et admins uniquement)
    if (!['gestionnaire', 'admin'].includes(userProfile.role)) {
      return NextResponse.json({
        success: false,
        error: 'Permission refusée : seuls les gestionnaires et admins peuvent uploader des documents'
      }, { status: 403 })
    }

    // Parser FormData
    const formData = await request.formData()
    const file = formData.get('file') as File
    const documentType = formData.get('document_type') as string
    const teamId = formData.get('team_id') as string
    const buildingId = formData.get('building_id') as string | null
    const lotId = formData.get('lot_id') as string | null
    const visibilityLevel = (formData.get('visibility_level') as string) || 'equipe'
    const title = formData.get('title') as string | null
    const description = formData.get('description') as string | null
    const expiryDate = formData.get('expiry_date') as string | null

    // Validation
    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'Fichier requis'
      }, { status: 400 })
    }

    if (!documentType || !teamId) {
      return NextResponse.json({
        success: false,
        error: 'Champs requis manquants : document_type, team_id'
      }, { status: 400 })
    }

    // Valider XOR building_id/lot_id
    if (!buildingId && !lotId) {
      return NextResponse.json({
        success: false,
        error: 'building_id ou lot_id est requis'
      }, { status: 400 })
    }

    if (buildingId && lotId) {
      return NextResponse.json({
        success: false,
        error: 'Fournir soit building_id SOIT lot_id, pas les deux'
      }, { status: 400 })
    }

    logger.info({
      filename: file.name,
      size: file.size,
      type: file.type,
      documentType,
      teamId,
      buildingId,
      lotId,
      userId: userProfile.id
    }, '📤 [PROPERTY-DOCS-UPLOAD] Starting upload')

    // Initialiser les services
    const storageService = createStorageService(supabase)
    const documentService = createPropertyDocumentService(supabase)

    // Générer un nom de fichier unique
    const timestamp = Date.now()
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const storagePath = `${teamId}/${buildingId || lotId}/${timestamp}_${sanitizedFilename}`

    // Upload vers Storage
    const uploadResult = await storageService.uploadFile({
      bucket: 'property-documents',
      path: storagePath,
      file: file,
      contentType: file.type
    })

    if (!uploadResult.success) {
      logger.error({ error: uploadResult.error }, '❌ [PROPERTY-DOCS-UPLOAD] Storage upload failed')
      return NextResponse.json({
        success: false,
        error: uploadResult.error?.message || 'Erreur lors de l\'upload du fichier'
      }, { status: 500 })
    }

    // Créer l'entrée en base de données
    const documentData = {
      filename: sanitizedFilename,
      original_filename: file.name,
      file_size: file.size,
      mime_type: file.type,
      storage_path: uploadResult.data!.path,
      storage_bucket: 'property-documents',
      document_type: documentType,
      team_id: teamId,
      building_id: buildingId || undefined,
      lot_id: lotId || undefined,
      visibility_level: visibilityLevel as 'equipe' | 'locataire',
      title: title || undefined,
      description: description || undefined,
      expiry_date: expiryDate || undefined,
      uploaded_by: userProfile.id
    }

    const createResult = await documentService.uploadDocument(documentData, {
      userId: userProfile.id,
      userRole: userProfile.role
    })

    if (!createResult.success) {
      // Rollback: supprimer le fichier du Storage
      await storageService.deleteFiles({
        bucket: 'property-documents',
        paths: [uploadResult.data!.path]
      })

      logger.error({ error: createResult.error }, '❌ [PROPERTY-DOCS-UPLOAD] Database insert failed')
      return NextResponse.json({
        success: false,
        error: typeof createResult.error === 'object' && createResult.error !== null && 'message' in createResult.error
          ? (createResult.error as { message: string }).message
          : 'Erreur lors de la création de l\'entrée document'
      }, { status: 500 })
    }

    logger.info({ documentId: createResult.data?.id }, '✅ [PROPERTY-DOCS-UPLOAD] Upload completed')

    return NextResponse.json({
      success: true,
      document: createResult.data
    }, { status: 201 })

  } catch (error) {
    logger.error({ error }, '❌ [PROPERTY-DOCS-UPLOAD] Unexpected error')
    return NextResponse.json({
      success: false,
      error: 'Erreur interne du serveur'
    }, { status: 500 })
  }
}
