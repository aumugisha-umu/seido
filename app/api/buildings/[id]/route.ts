import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'
import { logger } from '@/lib/logger'
import { createBuildingService } from '@/lib/services/domain/building.service'
import type { UpdateBuildingDTO } from '@/lib/services/core/service-types'

/**
 * GET /api/buildings/[id]
 * Récupère un bâtiment par son ID
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

    logger.info({ buildingId: id, userId: userProfile.id }, '🏢 [BUILDINGS-API] GET by ID request')

    // Initialiser le service
    const buildingService = createBuildingService(supabase)

    // Récupérer le bâtiment avec relations
    const result = await buildingService.getByIdWithRelations(id)

    if (!result.success || !result.data) {
      logger.warn({ buildingId: id }, '⚠️ [BUILDINGS-API] Building not found')
      return NextResponse.json({
        success: false,
        error: 'Bâtiment introuvable'
      }, { status: 404 })
    }

    logger.info({ buildingId: id }, '✅ [BUILDINGS-API] Building fetched successfully')

    return NextResponse.json({
      success: true,
      building: result.data
    })

  } catch (error) {
    logger.error({ error }, '❌ [BUILDINGS-API] Unexpected error in GET by ID')
    return NextResponse.json({
      success: false,
      error: 'Erreur interne du serveur'
    }, { status: 500 })
  }
}

/**
 * PUT /api/buildings/[id]
 * Met à jour un bâtiment
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
        error: 'Permission refusée : seuls les gestionnaires et admins peuvent modifier des bâtiments'
      }, { status: 403 })
    }

    // Parser le body
    const body: UpdateBuildingDTO = await request.json()

    logger.info({
      buildingId: id,
      userId: userProfile.id,
      updates: Object.keys(body)
    }, '🏢 [BUILDINGS-API] PUT request - Updating building')

    // Initialiser le service
    const buildingService = createBuildingService(supabase)

    // Mettre à jour le bâtiment
    const result = await buildingService.update(id, body)

    if (!result.success) {
      logger.error({ buildingId: id, error: result.error }, '❌ [BUILDINGS-API] Error updating building')
      return NextResponse.json({
        success: false,
        error: typeof result.error === 'object' && result.error !== null && 'message' in result.error
          ? (result.error as { message: string }).message
          : 'Erreur lors de la mise à jour du bâtiment'
      }, { status: 400 })
    }

    logger.info({ buildingId: id }, '✅ [BUILDINGS-API] Building updated successfully')

    return NextResponse.json({
      success: true,
      building: result.data
    })

  } catch (error) {
    logger.error({ error }, '❌ [BUILDINGS-API] Unexpected error in PUT')
    return NextResponse.json({
      success: false,
      error: 'Erreur interne du serveur'
    }, { status: 500 })
  }
}

/**
 * DELETE /api/buildings/[id]
 * Supprime un bâtiment (soft delete)
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
        error: 'Permission refusée : seuls les gestionnaires et admins peuvent supprimer des bâtiments'
      }, { status: 403 })
    }

    logger.info({
      buildingId: id,
      userId: userProfile.id
    }, '🏢 [BUILDINGS-API] DELETE request - Deleting building')

    // Initialiser le service
    const buildingService = createBuildingService(supabase)

    // Supprimer le bâtiment
    const result = await buildingService.delete(id)

    if (!result.success) {
      logger.error({ buildingId: id, error: result.error }, '❌ [BUILDINGS-API] Error deleting building')
      return NextResponse.json({
        success: false,
        error: typeof result.error === 'object' && result.error !== null && 'message' in result.error
          ? (result.error as { message: string }).message
          : 'Erreur lors de la suppression du bâtiment'
      }, { status: 400 })
    }

    logger.info({ buildingId: id }, '✅ [BUILDINGS-API] Building deleted successfully')

    return NextResponse.json({
      success: true,
      message: 'Bâtiment supprimé avec succès'
    })

  } catch (error) {
    logger.error({ error }, '❌ [BUILDINGS-API] Unexpected error in DELETE')
    return NextResponse.json({
      success: false,
      error: 'Erreur interne du serveur'
    }, { status: 500 })
  }
}
