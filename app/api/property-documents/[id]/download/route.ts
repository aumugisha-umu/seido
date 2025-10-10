import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'
import { logger } from '@/lib/logger'
import { createPropertyDocumentService, createStorageService } from '@/lib/services'

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
