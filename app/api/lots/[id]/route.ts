import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'
import { logger } from '@/lib/logger'
import { createLotService } from '@/lib/services/domain/lot.service'
import type { LotUpdate } from '@/lib/services/core/service-types'

/**
 * GET /api/lots/[id]
 * Récupère un lot par son ID
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

    logger.info({ lotId: id, userId: userProfile.id }, '🏠 [LOTS-API] GET by ID request')

    // Initialiser le service
    const lotService = await createLotService()

    // Récupérer le lot avec relations
    const result = await lotService.getByIdWithRelations(id)

    if (!result.success || !result.data) {
      logger.warn({ lotId: id }, '⚠️ [LOTS-API] Lot not found')
      return NextResponse.json({
        success: false,
        error: 'Lot introuvable'
      }, { status: 404 })
    }

    logger.info({ lotId: id }, '✅ [LOTS-API] Lot fetched successfully')

    return NextResponse.json({
      success: true,
      lot: result.data
    })

  } catch (error) {
    logger.error({ error }, '❌ [LOTS-API] Unexpected error in GET by ID')
    return NextResponse.json({
      success: false,
      error: 'Erreur interne du serveur'
    }, { status: 500 })
  }
}

/**
 * PUT /api/lots/[id]
 * Met à jour un lot
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

    // Vérifier les permissions
    if (!['gestionnaire', 'admin'].includes(userProfile.role)) {
      return NextResponse.json({
        success: false,
        error: 'Permission refusée : seuls les gestionnaires et admins peuvent modifier des lots'
      }, { status: 403 })
    }

    // Parser le body
    const body: LotUpdate = await request.json()

    logger.info({
      lotId: id,
      userId: userProfile.id,
      updates: Object.keys(body)
    }, '🏠 [LOTS-API] PUT request - Updating lot')

    // Initialiser le service
    const lotService = await createLotService()

    // Mettre à jour le lot
    const result = await lotService.update(id, body)

    if (!result.success) {
      logger.error({ lotId: id, error: result.error }, '❌ [LOTS-API] Error updating lot')
      return NextResponse.json({
        success: false,
        error: typeof result.error === 'object' && result.error !== null && 'message' in result.error
          ? (result.error as { message: string }).message
          : 'Erreur lors de la mise à jour du lot'
      }, { status: 400 })
    }

    logger.info({ lotId: id }, '✅ [LOTS-API] Lot updated successfully')

    return NextResponse.json({
      success: true,
      lot: result.data
    })

  } catch (error) {
    logger.error({ error }, '❌ [LOTS-API] Unexpected error in PUT')
    return NextResponse.json({
      success: false,
      error: 'Erreur interne du serveur'
    }, { status: 500 })
  }
}

/**
 * DELETE /api/lots/[id]
 * Supprime un lot
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

    // Vérifier les permissions
    if (!['gestionnaire', 'admin'].includes(userProfile.role)) {
      return NextResponse.json({
        success: false,
        error: 'Permission refusée : seuls les gestionnaires et admins peuvent supprimer des lots'
      }, { status: 403 })
    }

    logger.info({
      lotId: id,
      userId: userProfile.id
    }, '🏠 [LOTS-API] DELETE request - Deleting lot')

    // Initialiser le service
    const lotService = await createLotService()

    // Supprimer le lot
    const result = await lotService.delete(id)

    if (!result.success) {
      logger.error({ lotId: id, error: result.error }, '❌ [LOTS-API] Error deleting lot')
      return NextResponse.json({
        success: false,
        error: typeof result.error === 'object' && result.error !== null && 'message' in result.error
          ? (result.error as { message: string }).message
          : 'Erreur lors de la suppression du lot'
      }, { status: 400 })
    }

    logger.info({ lotId: id }, '✅ [LOTS-API] Lot deleted successfully')

    return NextResponse.json({
      success: true,
      message: 'Lot supprimé avec succès'
    })

  } catch (error) {
    logger.error({ error }, '❌ [LOTS-API] Unexpected error in DELETE')
    return NextResponse.json({
      success: false,
      error: 'Erreur interne du serveur'
    }, { status: 500 })
  }
}
