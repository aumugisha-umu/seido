import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { createPropertyDocumentService, createStorageService } from '@/lib/services'
import { getApiAuthContext } from '@/lib/api-auth-helper'

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
    // ✅ AUTH + ROLE CHECK: 64 lignes → 3 lignes! (gestionnaire required, admin bypass inclus)
    const authResult = await getApiAuthContext({ requiredRole: 'gestionnaire' })
    if (!authResult.success) return authResult.error

    const { supabase, userProfile } = authResult.data

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
