import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { getApiAuthContext } from '@/lib/api-auth-helper'

export async function GET(request: NextRequest) {
  logger.info({}, "👁️ view-intervention-document API route called")

  try {
    // ✅ AUTH: 29 lignes → 3 lignes!
    const authResult = await getApiAuthContext()
    if (!authResult.success) return authResult.error

    const { supabase, userProfile } = authResult.data

    // Get document ID from query params
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')

    if (!documentId) {
      return NextResponse.json({ 
        error: 'documentId est requis' 
      }, { status: 400 })
    }

    logger.info({ documentId: documentId }, "👁️ Getting document for viewing:")

    // Get document information and verify access
    const { data: document, error: docError } = await supabase
      .from('intervention_documents')
      .select(`
        *,
        intervention:intervention_id!inner(
          id,
          title,
          reference,
          team_id,
          team:team_id!inner(
            members:team_members!inner(user_id)
          )
        )
      `)
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      logger.error({ docError: docError }, "❌ Document not found:")
      return NextResponse.json({ 
        error: 'Document non trouvé' 
      }, { status: 404 })
    }

    // Check if user is member of the team that owns this intervention
    const userHasAccess = document.intervention.team.members.some(
      (member) => member.user_id === userProfile.id
    )

    if (!userHasAccess) {
      logger.error("❌ User not member of document's intervention team")
      return NextResponse.json({ 
        error: 'Accès refusé à ce document' 
      }, { status: 403 })
    }

    logger.info({ document: document.storage_path }, "🔐 Generating signed URL for viewing:")

    // Generate signed URL for viewing (valid for 30 minutes)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(document.storage_bucket || 'documents')
      .createSignedUrl(document.storage_path, 1800) // 30 minutes expiry

    if (signedUrlError || !signedUrlData) {
      logger.error({ error: signedUrlError }, "❌ Error generating signed URL:")
      return NextResponse.json({ 
        error: 'Erreur lors de la génération de l\'URL de visualisation' 
      }, { status: 500 })
    }

    logger.info({}, "✅ Signed URL for viewing generated successfully")

    return NextResponse.json({
      success: true,
      viewUrl: signedUrlData.signedUrl,
      document: {
        id: document.id,
        filename: document.original_filename,
        size: document.file_size,
        type: document.mime_type,
        documentType: document.document_type,
        description: document.description,
        uploadedAt: document.uploaded_at
      },
      intervention: {
        id: document.intervention.id,
        title: document.intervention.title,
        reference: document.intervention.reference
      },
      expiresIn: 1800 // 30 minutes in seconds
    })

  } catch (error) {
    logger.error({ error: error }, "❌ Error in view-intervention-document API:")
    logger.error({
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack',
    }, "❌ Error details:")

    return NextResponse.json({
      success: false,
      error: 'Erreur interne du serveur lors de la génération de l\'URL de visualisation'
    }, { status: 500 })
  }
}
