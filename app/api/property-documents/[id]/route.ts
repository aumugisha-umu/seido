import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'
import { logger } from '@/lib/logger'
import { createPropertyDocumentService } from '@/lib/services/domain/property-document.service'
import type { UpdatePropertyDocumentDTO } from '@/lib/services/core/service-types'

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
      .select('id, role')
      .eq('auth_user_id', authUser.id)
      .single()

    if (!userProfile) {
      return NextResponse.json({
        success: false,
        error: 'Profil utilisateur introuvable'
      }, { status: 404 })
    }

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
      .select('id, role')
      .eq('auth_user_id', authUser.id)
      .single()

    if (!userProfile) {
      return NextResponse.json({
        success: false,
        error: 'Profil utilisateur introuvable'
      }, { status: 404 })
    }

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
      .select('id, role')
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
        error: 'Permission refusée : seuls les gestionnaires et admins peuvent supprimer des documents'
      }, { status: 403 })
    }

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
