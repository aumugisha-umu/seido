import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { createPropertyDocumentService, createStorageService } from '@/lib/services'
import { getApiAuthContext } from '@/lib/api-auth-helper'

/**
 * GET /api/property-documents/[id]/download
 * Génère un signed URL pour télécharger un document
 *
 * Query params:
 * - expiresIn: number (optionnel, durée de validité en secondes, défaut: 3600 = 1 heure)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // ✅ AUTH: 42 lignes → 3 lignes!
    const authResult = await getApiAuthContext()
    if (!authResult.success) return authResult.error

    const { supabase, userProfile } = authResult.data

    // Parser query params
    const { searchParams } = new URL(request.url)
    const expiresIn = parseInt(searchParams.get('expiresIn') || '3600', 10)

    logger.info({ documentId: id, userId: userProfile.id }, '📥 [PROPERTY-DOCS-DOWNLOAD] Download request')

    // Initialiser les services
    const documentService = createPropertyDocumentService(supabase)
    const storageService = createStorageService(supabase)

    // Récupérer le document (RLS vérifie automatiquement les permissions)
    const docResult = await documentService.getDocument(id, {
      userId: userProfile.id,
      userRole: userProfile.role
    })

    if (!docResult.success || !docResult.data) {
      logger.warn({ documentId: id }, '⚠️ [PROPERTY-DOCS-DOWNLOAD] Document not found or no permission')
      return NextResponse.json({
        success: false,
        error: 'Document introuvable ou accès refusé'
      }, { status: 404 })
    }

    const document = docResult.data

    // Générer le signed URL
    const downloadResult = await storageService.downloadFile({
      bucket: document.storage_bucket || 'property-documents',
      path: document.storage_path,
      expiresIn
    })

    if (!downloadResult.success) {
      logger.error({ error: downloadResult.error, documentId: id }, '❌ [PROPERTY-DOCS-DOWNLOAD] Failed to generate signed URL')
      return NextResponse.json({
        success: false,
        error: downloadResult.error?.message || 'Erreur lors de la génération du lien de téléchargement'
      }, { status: 500 })
    }

    logger.info({ documentId: id, expiresAt: downloadResult.data!.expiresAt }, '✅ [PROPERTY-DOCS-DOWNLOAD] Signed URL generated')

    return NextResponse.json({
      success: true,
      data: {
        signedUrl: downloadResult.data!.signedUrl,
        expiresAt: downloadResult.data!.expiresAt,
        document: {
          id: document.id,
          filename: document.original_filename,
          size: document.file_size,
          mimeType: document.mime_type
        }
      }
    })

  } catch (error) {
    logger.error({ error }, '❌ [PROPERTY-DOCS-DOWNLOAD] Unexpected error')
    return NextResponse.json({
      success: false,
      error: 'Erreur interne du serveur'
    }, { status: 500 })
  }
}
