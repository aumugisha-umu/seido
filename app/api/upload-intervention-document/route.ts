import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { uploadInterventionDocumentSchema, validateRequest, formatZodErrors } from '@/lib/validation/schemas'
import { createActivityLogger } from '@/lib/activity-logger'

// Helper function to determine document type from file type and name
function getDocumentType(mimeType: string, filename: string): string {
  const lowerFilename = filename.toLowerCase()

  // Audio (voice notes)
  if (mimeType.startsWith('audio/')) {
    return 'note_vocale'
  }

  // Photos
  if (mimeType.startsWith('image/')) {
    if (lowerFilename.includes('avant')) return 'photo_avant'
    if (lowerFilename.includes('apres') || lowerFilename.includes('après')) return 'photo_apres'
    return 'photo_avant' // Default for images
  }
  
  // Documents
  if (mimeType === 'application/pdf') {
    if (lowerFilename.includes('rapport')) return 'rapport'
    if (lowerFilename.includes('facture')) return 'facture'
    if (lowerFilename.includes('devis')) return 'devis'
    if (lowerFilename.includes('plan')) return 'plan'
    if (lowerFilename.includes('certificat')) return 'certificat'
    if (lowerFilename.includes('garantie')) return 'garantie'
  }
  
  // Spreadsheets and documents
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
    if (lowerFilename.includes('devis')) return 'devis'
    if (lowerFilename.includes('facture')) return 'facture'
  }
  
  return 'autre' // Default type
}

// Generate unique filename to avoid conflicts
function generateUniqueFilename(originalFilename: string): string {
  const timestamp = Date.now()
  const randomString = Math.random().toString(36).substring(2, 8)
  const extension = originalFilename.split('.').pop()
  const nameWithoutExt = originalFilename.split('.').slice(0, -1).join('.')

  return `${timestamp}-${randomString}-${nameWithoutExt}.${extension}`
}

export async function POST(request: NextRequest) {
  logger.info({}, "📤 upload-intervention-document API route called")

  try {
    // ✅ AUTH: 29 lignes → 3 lignes!
    const authResult = await getApiAuthContext()
    if (!authResult.success) return authResult.error

    const { supabase, userProfile } = authResult.data

    // Parse the form data
    const formData = await request.formData()
    const file = formData.get('file') as File

    // Validation basique du fichier
    if (!file) {
      return NextResponse.json({
        error: 'file est requis'
      }, { status: 400 })
    }

    // Construire l'objet pour validation Zod
    // Strip codec suffix (e.g. "audio/webm;codecs=opus" → "audio/webm") for Zod enum validation
    const normalizedMimeType = file.type.split(';')[0].trim()

    const requestData = {
      interventionId: formData.get('interventionId') as string,
      fileName: file.name,
      fileSize: file.size,
      fileType: normalizedMimeType,
      description: formData.get('description') as string | undefined
    }

    // ✅ ZOD VALIDATION
    const validation = validateRequest(uploadInterventionDocumentSchema, requestData)
    if (!validation.success) {
      logger.warn({ errors: formatZodErrors(validation.errors) }, '⚠️ [UPLOAD-INTERVENTION-DOC] Validation failed')
      return NextResponse.json({
        success: false,
        error: 'Données invalides',
        details: formatZodErrors(validation.errors)
      }, { status: 400 })
    }

    const validatedData = validation.data

    logger.info({
      interventionId: validatedData.interventionId,
      filename: validatedData.fileName,
      size: validatedData.fileSize,
      type: validatedData.fileType
    }, "📁 Processing file upload:")

    // Verify that the user has access to this intervention
    const { data: intervention, error: interventionError } = await supabase
      .from('interventions')
      .select(`
        id,
        team_id,
        team:team_id!inner(
          members:team_members!inner(user_id)
        )
      `)
      .eq('id', validatedData.interventionId)
      .single()

    if (interventionError || !intervention) {
      logger.error({ interventionError: interventionError }, "❌ Intervention not found or access denied:")
      return NextResponse.json({ 
        error: 'Intervention non trouvée ou accès refusé' 
      }, { status: 403 })
    }

    // Check if user is member of the team
    const userHasAccess = intervention.team.members.some(
      (member) => member.user_id === userProfile.id
    )

    if (!userHasAccess) {
      logger.error({}, "❌ User not member of intervention team")
      return NextResponse.json({ 
        error: 'Accès refusé à cette intervention' 
      }, { status: 403 })
    }

    // Generate unique filename and storage path
    // Path format: {team_id}/{intervention_id}/{filename} — team_id first for RLS path-based checks
    const uniqueFilename = generateUniqueFilename(validatedData.fileName)
    const storagePath = `${intervention.team_id}/${validatedData.interventionId}/${uniqueFilename}`

    logger.info({ storagePath: storagePath }, "☁️ Uploading to Supabase Storage:")

    // Upload file to Supabase Storage
    // Use normalized MIME type to pass bucket's allowed_mime_types check
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, file, {
        contentType: normalizedMimeType,
        upsert: false // Don't overwrite if file exists
      })

    if (uploadError) {
      logger.error({ error: uploadError }, "❌ Error uploading file to storage:")
      return NextResponse.json({ 
        error: 'Erreur lors de l\'upload du fichier: ' + uploadError.message 
      }, { status: 500 })
    }

    logger.info({ uploadData: uploadData.path }, "✅ File uploaded to storage:")

    // Store document metadata in database
    const { data: document, error: docError } = await supabase
      .from('intervention_documents')
      .insert({
        intervention_id: validatedData.interventionId,
        team_id: intervention.team_id, // Required NOT NULL field
        filename: uniqueFilename,
        original_filename: validatedData.fileName,
        file_size: validatedData.fileSize,
        mime_type: normalizedMimeType,
        storage_path: uploadData.path,
        storage_bucket: 'documents',
        document_type: getDocumentType(validatedData.fileType, validatedData.fileName),
        uploaded_by: userProfile.id,
        description: validatedData.description || `Document ajouté pour l'intervention`
      })
      .select(`
        *,
        uploaded_by_user:uploaded_by(name, email)
      `)
      .single()

    if (docError) {
      logger.error({ error: docError }, "❌ Error storing document metadata:")
      
      // Try to clean up the uploaded file if metadata storage fails
      try {
        await supabase.storage
          .from('documents')
          .remove([uploadData.path])
      } catch (cleanupError) {
        logger.error({ error: cleanupError }, "⚠️ Error cleaning up uploaded file:")
      }
      
      return NextResponse.json({ 
        error: 'Erreur lors de l\'enregistrement des métadonnées du document' 
      }, { status: 500 })
    }

    logger.info({ data: document.id }, "✅ Document metadata stored:")

    // Update intervention to mark it as having attachments
    // Note: This is handled automatically by database trigger, but we update it here for immediate consistency
    const { error: updateError } = await supabase
      .from('interventions')
      .update({ has_attachments: true })
      .eq('id', validatedData.interventionId)

    if (updateError) {
      logger.warn({ updateError: updateError }, "⚠️ Warning: Could not update intervention has_attachments flag (non-critical, trigger will handle it)")
      // Don't fail the entire operation for this - the database trigger will update it automatically
    } else {
      logger.info({}, "✅ Updated intervention has_attachments flag")
    }

    logger.info({}, "🎉 Document upload completed successfully")

    // 📝 ACTIVITY LOG: Document uploadé
    try {
      const activityLogger = await createActivityLogger()
      activityLogger.setContext({ userId: userProfile.id, teamId: intervention.team_id })
      await activityLogger.logDocumentAction(
        'upload',
        document.id,
        document.original_filename,
        { intervention_id: validatedData.interventionId, document_type: document.document_type, file_size: document.file_size }
      )
      logger.info({ documentId: document.id }, '📝 [UPLOAD-INTERVENTION-DOC] Activity logged')
    } catch (logError) {
      logger.error({ error: logError, documentId: document.id }, '⚠️ [UPLOAD-INTERVENTION-DOC] Failed to log activity')
    }

    // 🔔 NOTIFICATION: Document uploadé
    try {
      const { notifyDocumentUploaded } = await import('@/app/actions/notification-actions')
      await notifyDocumentUploaded({
        documentId: document.id,
        documentName: document.original_filename,
        teamId: intervention.team_id,
        uploadedBy: userProfile.id,
        relatedEntityType: 'intervention',
        relatedEntityId: validatedData.interventionId
      })
      logger.info({ documentId: document.id }, '🔔 [UPLOAD-INTERVENTION-DOC] Document upload notification sent')
    } catch (notifError) {
      logger.error({ error: notifError, documentId: document.id }, '⚠️ [UPLOAD-INTERVENTION-DOC] Failed to send document upload notification')
    }

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        filename: document.original_filename,
        size: document.file_size,
        type: document.mime_type,
        uploadedAt: document.uploaded_at,
        documentType: document.document_type,
        storagePath: document.storage_path,
        uploadedBy: {
          name: document.uploaded_by_user?.name || 'Utilisateur',
          email: document.uploaded_by_user?.email
        }
      },
      message: 'Document uploadé avec succès'
    })

  } catch (error) {
    logger.error({ error: error }, "❌ Error in upload-intervention-document API:")
    logger.error({
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack',
    }, "❌ Error details:")

    return NextResponse.json({
      success: false,
      error: 'Erreur interne du serveur lors de l\'upload du document'
    }, { status: 500 })
  }
}
