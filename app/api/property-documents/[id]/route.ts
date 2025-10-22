import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { createPropertyDocumentService } from '@/lib/services/domain/property-document.service'
import type { UpdatePropertyDocumentDTO } from '@/lib/services/core/service-types'
import { getApiAuthContext } from '@/lib/api-auth-helper'

/**
 * GET /api/property-documents/[id]
 * Récupère un document par son ID
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

    logger.info({ documentId: id, userId: userProfile.id }, '📄 [PROPERTY-DOCS-API] GET by ID request')

    // Initialiser le service
    const documentService = createPropertyDocumentService(supabase)

    // Récupérer le document (RLS vérifie les permissions automatiquement)
    const result = await documentService.getDocument(id, {
      userId: userProfile.id,
      userRole: userProfile.role
    })

    if (!result.success || !result.data) {
      logger.warn({ documentId: id }, '⚠️ [PROPERTY-DOCS-API] Document not found or no permission')
      return NextResponse.json({
        success: false,
        error: 'Document introuvable ou accès refusé'
      }, { status: 404 })
    }

    logger.info({ documentId: id }, '✅ [PROPERTY-DOCS-API] Document fetched successfully')

    return NextResponse.json({
      success: true,
      document: result.data
    })

  } catch (error) {
    logger.error({ error }, '❌ [PROPERTY-DOCS-API] Unexpected error in GET by ID')
    return NextResponse.json({
      success: false,
      error: 'Erreur interne du serveur'
    }, { status: 500 })
  }
}

/**
 * PUT /api/property-documents/[id]
 * Met à jour un document
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // ✅ AUTH: 42 lignes → 3 lignes!
    const authResult = await getApiAuthContext()
    if (!authResult.success) return authResult.error

    const { supabase, userProfile } = authResult.data

    // Parser le body
    const body: UpdatePropertyDocumentDTO = await request.json()

    logger.info({
      documentId: id,
      userId: userProfile.id,
      updates: Object.keys(body)
    }, '📄 [PROPERTY-DOCS-API] PUT request - Updating document')

    // Initialiser le service
    const documentService = createPropertyDocumentService(supabase)

    // Mettre à jour le document
    const result = await documentService.updateDocument(id, body, {
      userId: userProfile.id,
      userRole: userProfile.role
    })

    if (!result.success) {
      logger.error({ documentId: id, error: result.error }, '❌ [PROPERTY-DOCS-API] Error updating document')
      return NextResponse.json({
        success: false,
        error: typeof result.error === 'object' && result.error !== null && 'message' in result.error
          ? (result.error as { message: string }).message
          : 'Erreur lors de la mise à jour du document'
      }, { status: 400 })
    }

    logger.info({ documentId: id }, '✅ [PROPERTY-DOCS-API] Document updated successfully')

    return NextResponse.json({
      success: true,
      document: result.data
    })

  } catch (error) {
    logger.error({ error }, '❌ [PROPERTY-DOCS-API] Unexpected error in PUT')
    return NextResponse.json({
      success: false,
      error: 'Erreur interne du serveur'
    }, { status: 500 })
  }
}

/**
 * DELETE /api/property-documents/[id]
 * Supprime un document (soft delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // ✅ AUTH + ROLE CHECK: 64 lignes → 3 lignes! (gestionnaire required, admin bypass inclus)
    const authResult = await getApiAuthContext({ requiredRole: 'gestionnaire' })
    if (!authResult.success) return authResult.error

    const { supabase, userProfile } = authResult.data

    logger.info({
      documentId: id,
      userId: userProfile.id
    }, '📄 [PROPERTY-DOCS-API] DELETE request - Deleting document')

    // Initialiser le service
    const documentService = createPropertyDocumentService(supabase)

    // Supprimer le document
    const result = await documentService.deleteDocument(id, {
      userId: userProfile.id,
      userRole: userProfile.role
    })

    if (!result.success) {
      logger.error({ documentId: id, error: result.error }, '❌ [PROPERTY-DOCS-API] Error deleting document')
      return NextResponse.json({
        success: false,
        error: typeof result.error === 'object' && result.error !== null && 'message' in result.error
          ? (result.error as { message: string }).message
          : 'Erreur lors de la suppression du document'
      }, { status: 400 })
    }

    logger.info({ documentId: id }, '✅ [PROPERTY-DOCS-API] Document deleted successfully')

    return NextResponse.json({
      success: true,
      message: 'Document supprimé avec succès'
    })

  } catch (error) {
    logger.error({ error }, '❌ [PROPERTY-DOCS-API] Unexpected error in DELETE')
    return NextResponse.json({
      success: false,
      error: 'Erreur interne du serveur'
    }, { status: 500 })
  }
}
