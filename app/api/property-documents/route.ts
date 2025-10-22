import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { createPropertyDocumentService } from '@/lib/services/domain/property-document.service'
import type { CreatePropertyDocumentDTO } from '@/lib/services/core/service-types'
import { getApiAuthContext } from '@/lib/api-auth-helper'

/**
 * GET /api/property-documents
 * Récupère la liste des documents (filtrable par team, building ou lot)
 */
export async function GET(request: NextRequest) {
  try {
    // ✅ AUTH: 42 lignes → 3 lignes! (ancien pattern createServerClient → getApiAuthContext)
    const authResult = await getApiAuthContext()
    if (!authResult.success) return authResult.error

    const { supabase, userProfile } = authResult.data

    // Parser query params
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')
    const buildingId = searchParams.get('buildingId')
    const lotId = searchParams.get('lotId')
    const includeArchived = searchParams.get('includeArchived') === 'true'

    logger.info({
      teamId,
      buildingId,
      lotId,
      userId: userProfile.id,
      role: userProfile.role
    }, '📄 [PROPERTY-DOCS-API] GET request')

    // Initialiser le service
    const documentService = createPropertyDocumentService(supabase)

    // Récupérer les documents
    let result
    if (lotId) {
      result = await documentService.getDocumentsByLot(lotId, { includeArchived })
    } else if (buildingId) {
      result = await documentService.getDocumentsByBuilding(buildingId, { includeArchived })
    } else if (teamId) {
      result = await documentService.getDocumentsByTeam(teamId, { includeArchived })
    } else {
      // Par défaut, documents de l'équipe de l'utilisateur
      result = await documentService.getDocumentsByTeam(userProfile.team_id || '', { includeArchived })
    }

    if (!result.success) {
      logger.error({ error: result.error }, '❌ [PROPERTY-DOCS-API] Error fetching documents')
      return NextResponse.json({
        success: false,
        error: 'Erreur lors de la récupération des documents'
      }, { status: 500 })
    }

    logger.info({ count: result.data?.length || 0 }, '✅ [PROPERTY-DOCS-API] Documents fetched successfully')

    return NextResponse.json({
      success: true,
      documents: result.data || []
    })

  } catch (error) {
    logger.error({ error }, '❌ [PROPERTY-DOCS-API] Unexpected error')
    return NextResponse.json({
      success: false,
      error: 'Erreur interne du serveur'
    }, { status: 500 })
  }
}

/**
 * POST /api/property-documents
 * Upload un nouveau document
 */
export async function POST(request: NextRequest) {
  try {
    // ✅ AUTH + ROLE CHECK: 64 lignes → 3 lignes! (gestionnaire required, admin bypass inclus)
    const authResult = await getApiAuthContext({ requiredRole: 'gestionnaire' })
    if (!authResult.success) return authResult.error

    const { supabase, userProfile } = authResult.data

    // Parser le body
    const body: CreatePropertyDocumentDTO = await request.json()

    logger.info({
      filename: body.filename,
      documentType: body.document_type,
      teamId: body.team_id,
      buildingId: body.building_id,
      lotId: body.lot_id,
      userId: userProfile.id
    }, '📄 [PROPERTY-DOCS-API] POST request - Uploading document')

    // Valider les champs requis
    if (!body.filename || !body.original_filename || !body.file_size || !body.mime_type || !body.storage_path || !body.document_type || !body.team_id) {
      return NextResponse.json({
        success: false,
        error: 'Champs requis manquants : filename, original_filename, file_size, mime_type, storage_path, document_type, team_id'
      }, { status: 400 })
    }

    // Valider que soit building_id SOIT lot_id est fourni
    if (!body.building_id && !body.lot_id) {
      return NextResponse.json({
        success: false,
        error: 'building_id ou lot_id est requis'
      }, { status: 400 })
    }

    if (body.building_id && body.lot_id) {
      return NextResponse.json({
        success: false,
        error: 'Fournir soit building_id SOIT lot_id, pas les deux'
      }, { status: 400 })
    }

    // Initialiser le service
    const documentService = createPropertyDocumentService(supabase)

    // Créer le document
    const result = await documentService.uploadDocument(
      {
        ...body,
        uploaded_by: userProfile.id
      },
      {
        userId: userProfile.id,
        userRole: userProfile.role
      }
    )

    if (!result.success) {
      logger.error({ error: result.error }, '❌ [PROPERTY-DOCS-API] Error uploading document')
      return NextResponse.json({
        success: false,
        error: typeof result.error === 'object' && result.error !== null && 'message' in result.error
          ? (result.error as { message: string }).message
          : 'Erreur lors de l\'upload du document'
      }, { status: 400 })
    }

    logger.info({ documentId: result.data?.id }, '✅ [PROPERTY-DOCS-API] Document uploaded successfully')

    return NextResponse.json({
      success: true,
      document: result.data
    }, { status: 201 })

  } catch (error) {
    logger.error({ error }, '❌ [PROPERTY-DOCS-API] Unexpected error in POST')
    return NextResponse.json({
      success: false,
      error: 'Erreur interne du serveur'
    }, { status: 500 })
  }
}
