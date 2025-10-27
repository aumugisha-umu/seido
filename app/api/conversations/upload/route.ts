import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { z } from 'zod'
import { formatZodErrors } from '@/lib/validation/schemas'

// Validation schema for chat file upload
const chatUploadSchema = z.object({
  threadId: z.string().uuid('Thread ID doit être un UUID valide'),
  fileName: z.string().min(1, 'Le nom de fichier est requis'),
  fileSize: z.number()
    .positive('La taille du fichier doit être positive')
    .max(10 * 1024 * 1024, 'Le fichier ne doit pas dépasser 10 MB'),
  fileType: z.string().min(1, 'Le type de fichier est requis'),
  description: z.string().optional()
})

// Allowed MIME types for chat attachments
const ALLOWED_MIME_TYPES = [
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'application/zip'
]

// Generate unique filename to avoid conflicts
function generateUniqueFilename(originalFilename: string): string {
  const timestamp = Date.now()
  const randomString = Math.random().toString(36).substring(2, 8)
  const extension = originalFilename.split('.').pop()
  const nameWithoutExt = originalFilename.split('.').slice(0, -1).join('.')

  // Clean the filename: remove special characters, accents, spaces
  const cleanName = nameWithoutExt
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-zA-Z0-9-_]/g, '-') // Replace special chars with dash
    .replace(/-+/g, '-') // Replace multiple dashes with single
    .substring(0, 50) // Limit length

  return `${timestamp}-${randomString}-${cleanName}.${extension}`
}

export async function POST(request: NextRequest) {
  logger.info({}, "📤 chat upload API route called")

  try {
    // ✅ AUTH
    const authResult = await getApiAuthContext()
    if (!authResult.success) return authResult.error

    const { supabase, userProfile } = authResult.data

    // Parse the form data
    const formData = await request.formData()
    const file = formData.get('file') as File

    // Basic file validation
    if (!file) {
      return NextResponse.json({
        error: 'Le fichier est requis'
      }, { status: 400 })
    }

    // Build object for Zod validation
    const requestData = {
      threadId: formData.get('threadId') as string,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      description: formData.get('description') as string | undefined
    }

    // ✅ ZOD VALIDATION
    const validation = chatUploadSchema.safeParse(requestData)
    if (!validation.success) {
      logger.warn({ errors: formatZodErrors(validation.error.errors) }, '⚠️ [CHAT-UPLOAD] Validation failed')
      return NextResponse.json({
        success: false,
        error: 'Données invalides',
        details: formatZodErrors(validation.error.errors)
      }, { status: 400 })
    }

    const validatedData = validation.data

    // Check MIME type
    if (!ALLOWED_MIME_TYPES.includes(validatedData.fileType)) {
      return NextResponse.json({
        error: 'Type de fichier non autorisé. Types acceptés: images, PDF, documents Office, texte, ZIP'
      }, { status: 400 })
    }

    logger.info({
      threadId: validatedData.threadId,
      filename: validatedData.fileName,
      size: validatedData.fileSize,
      type: validatedData.fileType
    }, "📁 Processing chat file upload")

    // Get the thread and verify access
    const { data: thread, error: threadError } = await supabase
      .from('conversation_threads')
      .select(`
        id,
        intervention_id,
        team_id
      `)
      .eq('id', validatedData.threadId)
      .single()

    if (threadError || !thread) {
      logger.error({ threadError }, "❌ Thread not found")
      return NextResponse.json({
        error: 'Conversation non trouvée'
      }, { status: 404 })
    }

    // Verify user has access to this thread
    // Check via ConversationService helper function
    const { data: hasAccess } = await supabase.rpc('can_view_conversation', {
      p_thread_id: validatedData.threadId
    })

    if (!hasAccess) {
      logger.error({}, "❌ User does not have access to this thread")
      return NextResponse.json({
        error: 'Accès refusé à cette conversation'
      }, { status: 403 })
    }

    // Generate unique filename and storage path
    const uniqueFilename = generateUniqueFilename(validatedData.fileName)
    const storagePath = `interventions/${thread.intervention_id}/${uniqueFilename}`

    logger.info({ storagePath }, "☁️ Uploading to Supabase Storage")

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('intervention-documents')
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      logger.error({ error: uploadError }, "❌ Error uploading file to storage")
      return NextResponse.json({
        error: 'Erreur lors de l\'upload du fichier: ' + uploadError.message
      }, { status: 500 })
    }

    logger.info({ path: uploadData.path }, "✅ File uploaded to storage")

    // Store document metadata in database
    // message_id is NULL at this point, will be updated when message is sent
    const { data: document, error: docError } = await supabase
      .from('intervention_documents')
      .insert({
        intervention_id: thread.intervention_id,
        team_id: thread.team_id,
        message_id: null, // Will be linked when message is sent
        filename: uniqueFilename,
        original_filename: validatedData.fileName,
        file_size: validatedData.fileSize,
        mime_type: validatedData.fileType,
        storage_path: uploadData.path,
        storage_bucket: 'intervention-documents',
        document_type: 'autre', // Default type for chat attachments
        uploaded_by: userProfile.id,
        description: validatedData.description || 'Fichier partagé via chat'
      })
      .select(`
        *,
        uploaded_by_user:uploaded_by(name, email)
      `)
      .single()

    if (docError) {
      logger.error({ error: docError }, "❌ Error storing document metadata")

      // Cleanup uploaded file if metadata storage fails
      try {
        await supabase.storage
          .from('intervention-documents')
          .remove([uploadData.path])
      } catch (cleanupError) {
        logger.error({ error: cleanupError }, "⚠️ Error cleaning up uploaded file")
      }

      return NextResponse.json({
        error: 'Erreur lors de l\'enregistrement des métadonnées du document'
      }, { status: 500 })
    }

    logger.info({ documentId: document.id }, "✅ Document metadata stored")

    // Generate signed URL for immediate display
    const { data: signedUrlData } = await supabase.storage
      .from('intervention-documents')
      .createSignedUrl(document.storage_path, 3600) // 1 hour expiry

    logger.info({}, "🎉 Chat file upload completed successfully")

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
      message: 'Fichier uploadé avec succès'
    })

  } catch (error) {
    logger.error({ error }, "❌ Error in chat upload API")
    logger.error({
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack',
    }, "❌ Error details")

    return NextResponse.json({
      success: false,
      error: 'Erreur interne du serveur lors de l\'upload du fichier'
    }, { status: 500 })
  }
}
