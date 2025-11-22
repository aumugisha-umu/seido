import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { createPropertyDocumentService, createStorageService } from '@/lib/services'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { uploadPropertyDocumentSchema, validateRequest, formatZodErrors } from '@/lib/validation/schemas'
import { createActivityLogger } from '@/lib/activity-logger'

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

    // Validation basique du fichier
    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'Fichier requis'
      }, { status: 400 })
    }

    // Construire l'objet pour validation Zod
    const requestData = {
      buildingId: formData.get('building_id') as string | undefined,
      lotId: formData.get('lot_id') as string | undefined,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      visibility: (formData.get('visibility_level') as string) || 'equipe',
      description: formData.get('description') as string | undefined
    }

    // ✅ ZOD VALIDATION
    const validation = validateRequest(uploadPropertyDocumentSchema, requestData)
    if (!validation.success) {
      logger.warn({ errors: formatZodErrors(validation.errors) }, '⚠️ [PROPERTY-DOCS-UPLOAD] Validation failed')
      return NextResponse.json({
        success: false,
        error: 'Données invalides',
        details: formatZodErrors(validation.errors)
      }, { status: 400 })
    }

    const validatedData = validation.data

    // Récupérer les champs restants après validation
    const documentType = formData.get('document_type') as string
    const teamId = formData.get('team_id') as string
    const title = formData.get('title') as string | null
    const expiryDate = formData.get('expiry_date') as string | null

    // Validation des champs non validés par Zod
    if (!documentType || !teamId) {
      return NextResponse.json({
        success: false,
        error: 'Champs requis manquants : document_type, team_id'
      }, { status: 400 })
    }

    logger.info({
      filename: validatedData.fileName,
      size: validatedData.fileSize,
      type: validatedData.fileType,
      documentType,
      teamId,
      buildingId: validatedData.buildingId,
      lotId: validatedData.lotId,
      userId: userProfile.id
    }, '📤 [PROPERTY-DOCS-UPLOAD] Starting upload')

    // Initialiser les services
    const storageService = createStorageService(supabase)
    const documentService = createPropertyDocumentService(supabase)

    // Générer un nom de fichier unique
    const timestamp = Date.now()
    const sanitizedFilename = validatedData.fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
    const storagePath = `${teamId}/${validatedData.buildingId || validatedData.lotId}/${timestamp}_${sanitizedFilename}`

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
      original_filename: validatedData.fileName,
      file_size: validatedData.fileSize,
      mime_type: validatedData.fileType,
      storage_path: uploadResult.data!.path,
      storage_bucket: 'property-documents',
      document_type: documentType,
      team_id: teamId,
      building_id: validatedData.buildingId || undefined,
      lot_id: validatedData.lotId || undefined,
      visibility_level: validatedData.visibility as 'equipe' | 'locataire',
      title: title || undefined,
      description: validatedData.description || undefined,
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

    // 📝 ACTIVITY LOG + 🔔 NOTIFICATION: Document property uploadé
    if (createResult.data) {
      const relatedEntityType = validatedData.buildingId ? 'building' : 'lot'
      const relatedEntityId = validatedData.buildingId || validatedData.lotId || ''

      // 📝 ACTIVITY LOG
      try {
        const activityLogger = await createActivityLogger()
        activityLogger.setContext({ userId: userProfile.id, teamId })
        await activityLogger.logDocumentAction(
          'upload',
          createResult.data.id,
          createResult.data.original_filename,
          {
            document_type: documentType,
            related_entity_type: relatedEntityType,
            related_entity_id: relatedEntityId,
            visibility: validatedData.visibility,
            file_size: createResult.data.file_size
          }
        )
        logger.info({ documentId: createResult.data.id }, '📝 [PROPERTY-DOCS-UPLOAD] Activity logged')
      } catch (logError) {
        logger.error({ error: logError, documentId: createResult.data.id }, '⚠️ [PROPERTY-DOCS-UPLOAD] Failed to log activity')
      }

      // 🔔 NOTIFICATION
      try {
        const { notifyDocumentUploaded } = await import('@/app/actions/notification-actions')
        await notifyDocumentUploaded({
          documentId: createResult.data.id,
          documentName: createResult.data.original_filename,
          teamId: teamId,
          uploadedBy: userProfile.id,
          relatedEntityType,
          relatedEntityId
        })
        logger.info({ documentId: createResult.data.id }, '🔔 [PROPERTY-DOCS-UPLOAD] Document upload notification sent')
      } catch (notifError) {
        logger.error({ error: notifError, documentId: createResult.data.id }, '⚠️ [PROPERTY-DOCS-UPLOAD] Failed to send document upload notification')
      }
    }

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
