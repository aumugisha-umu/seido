import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { uploadContractDocumentSchema, validateRequest, formatZodErrors } from '@/lib/validation/schemas'
import { createActivityLogger } from '@/lib/activity-logger'

// Generate unique filename to avoid conflicts
function generateUniqueFilename(originalFilename: string): string {
  const timestamp = Date.now()
  const randomString = Math.random().toString(36).substring(2, 8)
  const extension = originalFilename.split('.').pop()
  const nameWithoutExt = originalFilename.split('.').slice(0, -1).join('.')

  return `${timestamp}-${randomString}-${nameWithoutExt}.${extension}`
}

export async function POST(request: NextRequest) {
  logger.info({}, '📤 upload-contract-document API route called')

  try {
    // AUTH
    const authResult = await getApiAuthContext()
    if (!authResult.success) return authResult.error

    const { supabase, userProfile } = authResult.data

    // Check user role - only gestionnaire and admin can upload contract documents
    if (userProfile.role !== 'gestionnaire' && userProfile.role !== 'admin') {
      logger.warn({ userId: userProfile.id, role: userProfile.role }, '⚠️ Unauthorized role for contract document upload')
      return NextResponse.json({
        error: 'Seuls les gestionnaires peuvent uploader des documents de contrat'
      }, { status: 403 })
    }

    // Parse the form data
    const formData = await request.formData()
    const file = formData.get('file') as File

    // Basic file validation
    if (!file) {
      return NextResponse.json({
        error: 'file est requis'
      }, { status: 400 })
    }

    // Build object for Zod validation
    const requestData = {
      contractId: formData.get('contractId') as string,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      documentType: formData.get('documentType') as string || 'autre',
      description: formData.get('description') as string | undefined
    }

    // ZOD VALIDATION
    const validation = validateRequest(uploadContractDocumentSchema, requestData)
    if (!validation.success) {
      logger.warn({ errors: formatZodErrors(validation.errors) }, '⚠️ [UPLOAD-CONTRACT-DOC] Validation failed')
      return NextResponse.json({
        success: false,
        error: 'Données invalides',
        details: formatZodErrors(validation.errors)
      }, { status: 400 })
    }

    const validatedData = validation.data

    logger.info({
      contractId: validatedData.contractId,
      filename: validatedData.fileName,
      size: validatedData.fileSize,
      type: validatedData.fileType,
      documentType: validatedData.documentType
    }, '📁 Processing contract document upload')

    // Verify that the user has access to this contract via team membership
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select(`
        id,
        team_id,
        team:team_id!inner(
          members:team_members!inner(user_id)
        )
      `)
      .eq('id', validatedData.contractId)
      .single()

    if (contractError || !contract) {
      logger.error({ contractError }, '❌ Contract not found or access denied')
      return NextResponse.json({
        error: 'Contrat non trouvé ou accès refusé'
      }, { status: 403 })
    }

    // Check if user is member of the team
    const userHasAccess = contract.team.members.some(
      (member: { user_id: string }) => member.user_id === userProfile.id
    )

    if (!userHasAccess) {
      logger.error({}, '❌ User not member of contract team')
      return NextResponse.json({
        error: 'Accès refusé à ce contrat'
      }, { status: 403 })
    }

    // Generate unique filename and storage path
    // Path format: team_id/contract_id/filename (as per RLS policy comments)
    const uniqueFilename = generateUniqueFilename(validatedData.fileName)
    const storagePath = `${contract.team_id}/${validatedData.contractId}/${uniqueFilename}`

    logger.info({ storagePath }, '☁️ Uploading to Supabase Storage')

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('contract-documents')
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false // Don't overwrite if file exists
      })

    if (uploadError) {
      logger.error({ error: uploadError }, '❌ Error uploading file to storage')
      return NextResponse.json({
        error: 'Erreur lors de l\'upload du fichier: ' + uploadError.message
      }, { status: 500 })
    }

    logger.info({ path: uploadData.path }, '✅ File uploaded to storage')

    // Store document metadata in database
    const { data: document, error: docError } = await supabase
      .from('contract_documents')
      .insert({
        contract_id: validatedData.contractId,
        team_id: contract.team_id,
        filename: uniqueFilename,
        original_filename: validatedData.fileName,
        file_size: validatedData.fileSize,
        mime_type: validatedData.fileType,
        storage_path: uploadData.path,
        storage_bucket: 'contract-documents',
        document_type: validatedData.documentType,
        uploaded_by: userProfile.id,
        description: validatedData.description || `Document ${validatedData.documentType}`
      })
      .select(`
        *,
        uploaded_by_user:uploaded_by(name, email)
      `)
      .single()

    if (docError) {
      logger.error({ error: docError }, '❌ Error storing document metadata')

      // Try to clean up the uploaded file if metadata storage fails
      try {
        await supabase.storage
          .from('contract-documents')
          .remove([uploadData.path])
      } catch (cleanupError) {
        logger.error({ error: cleanupError }, '⚠️ Error cleaning up uploaded file')
      }

      return NextResponse.json({
        error: 'Erreur lors de l\'enregistrement des métadonnées du document'
      }, { status: 500 })
    }

    logger.info({ documentId: document.id }, '✅ Document metadata stored')

    // ACTIVITY LOG: Document uploaded
    try {
      const activityLogger = await createActivityLogger()
      activityLogger.setContext({ userId: userProfile.id, teamId: contract.team_id })
      await activityLogger.logDocumentAction(
        'upload',
        document.id,
        document.original_filename,
        { contract_id: validatedData.contractId, document_type: document.document_type, file_size: document.file_size }
      )
      logger.info({ documentId: document.id }, '📝 [UPLOAD-CONTRACT-DOC] Activity logged')
    } catch (logError) {
      logger.error({ error: logError, documentId: document.id }, '⚠️ [UPLOAD-CONTRACT-DOC] Failed to log activity')
    }

    // Generate signed URL for immediate access
    const { data: signedUrlData } = await supabase.storage
      .from('contract-documents')
      .createSignedUrl(uploadData.path, 3600) // 1 hour expiry

    logger.info({}, '🎉 Contract document upload completed successfully')

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
        signedUrl: signedUrlData?.signedUrl,
        uploadedBy: {
          name: document.uploaded_by_user?.name || 'Utilisateur',
          email: document.uploaded_by_user?.email
        }
      },
      message: 'Document uploadé avec succès'
    })

  } catch (error) {
    logger.error({ error }, '❌ Error in upload-contract-document API')
    logger.error({
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack',
    }, '❌ Error details')

    return NextResponse.json({
      success: false,
      error: 'Erreur interne du serveur lors de l\'upload du document'
    }, { status: 500 })
  }
}
